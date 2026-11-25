"""Actual LoRA optimization on KLUE entity-pair labels; no claim of NER accuracy."""
import os,json,hashlib,time,random
os.environ['HF_HUB_OFFLINE']='1';os.environ['TRANSFORMERS_OFFLINE']='1'
from pathlib import Path
import numpy as np,torch,pyarrow.parquet as pq
from transformers import AutoModel,AutoTokenizer
from peft import LoraConfig,get_peft_model
from sklearn.metrics import classification_report,accuracy_score
ROOT=Path(__file__).resolve().parent;random.seed(73);torch.manual_seed(73)
train=pq.read_table(ROOT/'models/klue/train.parquet');labels=json.loads(train.schema.metadata[b'huggingface'])['info']['features']['label']['names']
train=train.to_pylist();valid=pq.read_table(ROOT/'models/klue/validation.parquet').to_pylist();seen={r['sentence'] for r in train};valid=[r for r in valid if r['sentence'] not in seen]
random.shuffle(train);train=train[:12000]
model_id='intfloat/multilingual-e5-small';tokenizer=AutoTokenizer.from_pretrained(model_id,cache_dir=str(ROOT/'models/cache'),local_files_only=True)
encoder=AutoModel.from_pretrained(model_id,cache_dir=str(ROOT/'models/cache'),local_files_only=True).to('cuda')
encoder=get_peft_model(encoder,LoraConfig(r=8,lora_alpha=16,lora_dropout=.05,target_modules=['query','value'],task_type='FEATURE_EXTRACTION'))
head=torch.nn.Linear(384,len(labels)).to('cuda');optimizer=torch.optim.AdamW([{'params':[p for p in encoder.parameters() if p.requires_grad],'lr':2e-4},{'params':head.parameters(),'lr':1e-3}],weight_decay=.01)
def text(r):return 'query: 주체 '+r['subject_entity']['word']+' 대상 '+r['object_entity']['word']+' 문장 '+r['sentence']
def forward(rows):
 ids=tokenizer([text(r) for r in rows],padding=True,truncation=True,max_length=256,return_tensors='pt').to('cuda')
 output=encoder(**ids).last_hidden_state;mask=ids.attention_mask.unsqueeze(-1);return head((output*mask).sum(1)/mask.sum(1))
start=time.time();events=[];encoder.train();head.train()
for epoch in range(2):
 random.shuffle(train)
 for at in range(0,len(train),16):
  batch=train[at:at+16];optimizer.zero_grad();scores=forward(batch);loss=torch.nn.functional.cross_entropy(scores,torch.tensor([r['label'] for r in batch],device='cuda'));loss.backward();torch.nn.utils.clip_grad_norm_([p for p in encoder.parameters() if p.requires_grad]+list(head.parameters()),1);optimizer.step();step=len(events)+1;events.append({'step':step,'loss':float(loss.detach()),'seconds':round(time.time()-start,3)})
  if step%100==0:print('KLUE LoRA',step,'loss',events[-1]['loss'],flush=True)
encoder.eval();head.eval();pred=[]
with torch.inference_mode():
 for at in range(0,len(valid),32):pred.extend(forward(valid[at:at+32]).argmax(-1).cpu().tolist())
out=ROOT/'models/korean-pairs';out.mkdir(exist_ok=True);encoder.save_pretrained(out);torch.save(head.state_dict(),out/'head.pt')
run=dict(dataset='KLUE RE',revision='349481ec73fff722f88e0453ca05c77a447d967c',license='CC-BY-SA-4.0',training=len(train),testing=len(valid),epochs=2,seed=73,model='multilingual-e5-small LoRA r8 query/value + mean-pool linear head',labels=labels,accuracy=accuracy_score([r['label'] for r in valid],pred),perClass=classification_report([r['label'] for r in valid],pred,labels=list(range(len(labels))),target_names=labels,output_dict=True,zero_division=0),seconds=round(time.time()-start,2),events=events,adapterSha256=hashlib.sha256((out/'adapter_model.safetensors').read_bytes()).hexdigest(),headSha256=hashlib.sha256((out/'head.pt').read_bytes()).hexdigest(),limitation='Public official split with exact sentence overlap excluded. Subject/object spans supplied; not end-to-end actor extraction, real case accuracy, or legal judgement.')
(ROOT/'training/korean-pairs-run.json').write_text(json.dumps(run,ensure_ascii=False,indent=2),encoding='utf-8');print('KLUE_DONE',run['accuracy'],run['perClass']['macro avg'],flush=True)
