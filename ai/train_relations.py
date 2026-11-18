"""Fit a relation-type head on frozen E5; synthetic data and held-out templates are disclosed."""
import json,pickle,random,time,hashlib
from datetime import datetime,timezone
from pathlib import Path
from learning import SemanticClassifier
from sklearn.metrics import accuracy_score,classification_report,confusion_matrix
ROOT=Path(__file__).resolve().parent
patterns={
'payment':(['{a}는 {b}에게 {m}원을 송금했다.','{a}는 {b}에게 {m}원을 빌려주었다.','{a}가 {b}에게 대금을 이체했다.','{a}는 {b}에게 돈을 갚아 주었다.'],['{a}는 {b}에게 빌린 돈을 돌려주었다.','{a}가 {b}에게 계좌로 비용을 입금했다.']),
'violence':(['{a}는 {b}를 때렸다.','{a}가 {b}의 팔을 세게 잡아당겼다.','{a}는 {b}를 밀쳤다.','{a}가 {b}의 몸을 발로 찼다.'],['{a}는 {b}를 주먹으로 가격했다.','{a}가 {b}에게 맞았다.']),
'threat':(['{a}는 {b}에게 죽이겠다고 협박했다.','{a}는 {b}에게 신고하면 해치겠다고 말했다.','{a}가 {b}에게 가만두지 않겠다고 위협했다.','{a}는 {b}에게 돈을 안 주면 보복하겠다고 했다.'],['{a}가 {b}에게 가족을 다치게 하겠다고 했다.','{a}는 {b}에게 신상을 공개하겠다고 겁을 주었다.']),
'communication':(['{a}는 {b}에게 문자를 보냈다.','{a}가 {b}에게 전화했다.','{a}는 {b}와 만나 이야기를 나눴다.','{a}가 {b}에게 상황을 설명했다.'],['{a}는 {b}에게 메시지로 연락했다.','{a}는 {b}와 대화를 주고받았다.']),
'family':(['{a}는 {b}의 배우자다.','{a}와 {b}는 형제다.','{a}는 {b}의 아버지다.','{a}와 {b}는 부부다.'],['{a}는 {b}의 언니다.','{a}는 {b}의 자녀다.']),
'work':(['{a}는 {b}와 같은 회사에서 일한다.','{a}는 {b}를 고용했다.','{a}가 {b}의 회사에 입사했다.','{a}는 {b}와 업무 계약을 맺었다.'],['{a}는 {b}와 직장 동료다.','{a}는 {b}가 운영하는 가게의 직원이다.']),
'other':(['{a}는 오늘 비가 온다고 적었다.','{a}가 {b}와 관련 있는지는 알 수 없다.','{a}는 {b}라는 이름을 기억하지 못했다.','{a}가 {b}를 때렸는지는 모른다.'],['{a}가 {b}에게 무엇을 했는지는 확인되지 않았다.','오늘 일기에는 날씨와 점심 메뉴만 적혀 있다.'])}
train_names=['김민수','이서연','박지훈','최유진','정도윤','한수빈']; test_names=['윤하늘','강지우','서지호','오다은']
rows=[];random.seed(21)
for label,(train,test) in patterns.items():
 for split,templates,names in [('train',train,train_names),('test',test,test_names)]:
  for template in templates:
   for a in names:
    for b in names:
     if a==b: continue
     rows.append(dict(text=template.format(a=a,b=b,m=random.choice(['5만','12만','300만','4000만'])),label=label,split=split,synthetic=True))
rows=list({(x['split'],x['label'],x['text']):x for x in rows}.values())
started=time.time();run=dict(startedAt=datetime.now(timezone.utc).isoformat(),model='E5 + Ridge',events=[])
def log(stage,**values):
 event=dict(stage=stage,at=datetime.now(timezone.utc).isoformat(),seconds=round(time.time()-started,2),**values);run['events'].append(event)
 print(json.dumps(event,ensure_ascii=False),flush=True)
 (ROOT/'models/training-run.json').write_text(json.dumps(run,ensure_ascii=False,indent=2),encoding='utf-8')
log('dataset_ready',examples=len(rows))
model=SemanticClassifier();train=[x for x in rows if x['split']=='train'];test=[x for x in rows if x['split']=='test']
log('training_started',training=len(train),testing=len(test))
model.fit([x['text'] for x in train],[x['label'] for x in train]);log('model_fitted');pred=model.predict([x['text'] for x in test])
(ROOT/'data/relation-supervision.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
with (ROOT/'models/relation_classifier.pkl').open('wb') as f:pickle.dump(model,f)
metrics=dict(model='E5-small frozen embeddings + fitted Ridge relation head',training=len(train),testing=len(test),accuracy=accuracy_score([x['label'] for x in test],pred),evaluation='Synthetic unseen names and held-out sentence templates; not real-world legal accuracy',labels=list(model.classes_),confusionMatrix=confusion_matrix([x['label'] for x in test],pred,labels=model.classes_).tolist(),perClass=classification_report([x['label'] for x in test],pred,output_dict=True,zero_division=0))
(ROOT/'models/relation-metrics.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2),encoding='utf-8')
run['metrics']=metrics;run['datasetSha256']=hashlib.sha256((ROOT/'data/relation-supervision.json').read_bytes()).hexdigest();run['modelSha256']=hashlib.sha256((ROOT/'models/relation_classifier.pkl').read_bytes()).hexdigest()
log('evaluation_completed',accuracy=metrics['accuracy'])
(ROOT/'training').mkdir(exist_ok=True)
(ROOT/'training/latest-run.json').write_text(json.dumps(run,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(metrics,ensure_ascii=False),flush=True)
