"""Reproducible local classifier, morphology retrieval index, and Qwen LoRA training."""
import json, pickle, random, time, sys
from pathlib import Path
import numpy as np
from kiwipiepy import Kiwi
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import FeatureUnion, Pipeline
from learning import LearnedClassifier


ROOT = Path(__file__).resolve().parent
MODEL = ROOT / 'models'
MODEL.mkdir(exist_ok=True)

def train():
    random.seed(42)
    np.random.seed(42)
    rows = json.loads((ROOT/'data/supervision.json').read_text(encoding='utf-8'))
    train_rows = [r for r in rows if r['split']=='train']
    test_rows = [r for r in rows if r['split']=='test']
    if '--llm-only' not in sys.argv:
        pipeline = LearnedClassifier()
        pipeline.fit([r['text'] for r in train_rows], [r['label'] for r in train_rows])
        predictions=pipeline.predict([r['text'] for r in test_rows])
        with (MODEL/'classifier.pkl').open('wb') as f: pickle.dump(pipeline,f)
        corpus=json.loads((ROOT/'data/corpus.json').read_text(encoding='utf-8'))
        kiwi=Kiwi(num_workers=1)
        morph=lambda s:' '.join(t.form for t in kiwi.tokenize(s) if t.tag.startswith(('N','V','SL','SN')))
        vectorizer=TfidfVectorizer(ngram_range=(1,2), sublinear_tf=True)
        matrix=vectorizer.fit_transform([morph(c['content']) for c in corpus])
        with (MODEL/'retrieval.pkl').open('wb') as f: pickle.dump((vectorizer,matrix),f)
        metrics=dict(trainingExamples=len(train_rows), heldOutExamples=len(test_rows), split='행위 표현군 단위 분리 (같은 문형 변형은 같은 split)', accuracy=float(np.mean(predictions==np.array([r["label"] for r in test_rows]))),  corpusChunks=len(corpus), limitation='합성 소규모 평가. 실제 상담·사건에 대한 정확도, 법적 판단 성능을 의미하지 않음.')
        (MODEL/'metrics.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps(metrics,ensure_ascii=False),flush=True)
    else:
        metrics=json.loads((MODEL/'metrics.json').read_text(encoding='utf-8'))
        corpus=json.loads((ROOT/'data/corpus.json').read_text(encoding='utf-8'))
    import torch
    from transformers import AutoTokenizer, AutoModelForCausalLM
    from peft import LoraConfig, get_peft_model
    torch.manual_seed(42)
    base='Qwen/Qwen3-0.6B'
    tokenizer=AutoTokenizer.from_pretrained(base,cache_dir=str(MODEL/'cache'))
    model=AutoModelForCausalLM.from_pretrained(base,cache_dir=str(MODEL/'cache'),torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32).to('cuda' if torch.cuda.is_available() else 'cpu')
    model=get_peft_model(model,LoraConfig(r=8,lora_alpha=16,lora_dropout=0.05,target_modules=['q_proj','v_proj'],task_type='CAUSAL_LM'))
    model.train()
    optimizer=torch.optim.AdamW(model.parameters(),lr=3e-5)
    examples=random.sample(train_rows, min(72,len(train_rows)))
    # Include official texts as contextual language adaptation, separate from synthetic fact supervision.
    samples=[]
    system='제공된 원문만 근거로 사건을 정리한다. 원문에 없는 사실은 null. 출력은 JSON이다. 날짜를 추정하지 않는다.'
    for row in examples:
        prompt=tokenizer.apply_chat_template([{'role':'system','content':system},{'role':'user','content':row['text']}],tokenize=False,add_generation_prompt=True,enable_thinking=False)
        answer=json.dumps(row['output'],ensure_ascii=False)+tokenizer.eos_token
        samples.append((prompt,answer))
    reasoning=random.sample(train_rows,48)
    for i,row in enumerate(reasoning):
        questions=['확인한 사실만 한 문장으로 정리해줘.','무엇을 더 확인해야 할까?','이 내용만으로 법적 책임을 확정할 수 있어?']
        answers=[row['text'],'피해 내용, 목격자, 원본 자료를 확인해야 합니다. 기록에 없는 내용은 추정하지 않습니다.','제공된 기록만으로 사실의 진위나 법적 책임을 확정할 수 없습니다. 원본과 개별 사실 확인이 필요합니다.']
        prompt=tokenizer.apply_chat_template([{'role':'system','content':'한국어 증거정리 보조자. 제공된 자료만 근거로 짧게 답한다.\\n자료: '+row['text']},{'role':'user','content':questions[i%3]}],tokenize=False,add_generation_prompt=True,enable_thinking=False)
        samples.append((prompt,answers[i%3]+tokenizer.eos_token))
    legal_samples=random.sample(corpus,min(32,len(corpus)))
    for chunk in legal_samples:
        excerpt=chunk['content'][:180]
        prompt=tokenizer.apply_chat_template([{'role':'system','content':'제공된 법령·판결 원문만 근거로 답한다.\\n자료: '+chunk['content'][:600]},{'role':'user','content':'원문에서 확인할 수 있는 내용 일부를 그대로 제시해줘.'}],tokenize=False,add_generation_prompt=True,enable_thinking=False)
        samples.append((prompt,'참고 원문: '+excerpt+'\\n개별 사건에 적용할 수 있는지는 별도 확인이 필요합니다.'+tokenizer.eos_token))
    random.shuffle(samples)
    from datetime import datetime,timezone
    audit=ROOT/'training';audit.mkdir(exist_ok=True)
    (audit/'lora-samples.json').write_text(json.dumps([dict(prompt=p,answer=a) for p,a in samples],ensure_ascii=False,indent=2),encoding='utf-8')
    started_at=datetime.now(timezone.utc).isoformat()
    start=time.time(); losses=[]; events=[]
    for step,(prompt,answer) in enumerate(samples):
        ids=tokenizer(prompt+answer,return_tensors='pt',max_length=512,truncation=True).to(model.device)
        labels=ids.input_ids.clone(); prefix=len(tokenizer(prompt).input_ids)
        labels[:,:min(prefix,labels.shape[1]-1)]=-100
        loss=model(**ids,labels=labels).loss
        loss.backward(); torch.nn.utils.clip_grad_norm_(model.parameters(),1)
        optimizer.step(); optimizer.zero_grad(); losses.append(float(loss.detach()))
        events.append(dict(step=step+1,loss=losses[-1],seconds=round(time.time()-start,3)))
        if step%12==0: print(f'LoRA {step+1}/{len(samples)} loss={losses[-1]:.4f}',flush=True)
    model.save_pretrained(MODEL/'adapter'); tokenizer.save_pretrained(MODEL/'adapter')
    metrics['llm']=dict(base=base, adapter='LoRA r8 q_proj/v_proj', steps=len(samples), syntheticSFT=len(examples)+len(reasoning), legalContextSamples=min(32,len(corpus)), finalMeanTrainingLoss=float(np.mean(losses[-20:])), seconds=round(time.time()-start), device=str(model.device), baseRetrained=False, limitation='학습 loss만 측정. 생성 성능은 별도 검증 필요.')
    (MODEL/'metrics.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2),encoding='utf-8')
    import hashlib
    report=dict(startedAt=started_at,completedAt=datetime.now(timezone.utc).isoformat(),seed=42,optimizer='AdamW',learningRate=3e-5,maxTokens=512,model=metrics['llm'],events=events,samplesSha256=hashlib.sha256((audit/'lora-samples.json').read_bytes()).hexdigest(),adapterSha256=hashlib.sha256((MODEL/'adapter/adapter_model.safetensors').read_bytes()).hexdigest())
    (audit/'lora-run.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
    print('TRAINING_COMPLETE',flush=True)

if __name__=='__main__': train()
