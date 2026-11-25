"""Fictional evidence demo, processed by the actual local pipeline."""
import os,json,hashlib
os.environ['HF_HUB_OFFLINE']='1';os.environ['TRANSFORMERS_OFFLINE']='1'
from pathlib import Path
from worker import inspect
ROOT=Path(__file__).resolve().parent
sources=[('계약 메모','2026년 11월 16일 오후 2시 10분 김민수는 이서연과 행사 제작 계약을 맺었다.'),('송금 기록','2026년 11월 17일 오전 10시 20분 김민수는 이서연에게 5만원을 송금했다.'),('연락과 약속','2026년 11월 18일 오후 3시 10분 박지훈은 이서연에게 전화했다. 2026년 11월 18일 오후 4시 20분 이서연은 김민수에게 내일 자료를 보내겠다고 말했다.'),('서로 다른 진술','2026년 11월 18일 오후 5시 30분 김민수는 박지훈을 밀치지 않았다고 말했다. 2026년 11월 19일 오전 9시 10분 한수빈은 이서연이 돈을 돌려줬다는 이야기를 들었다.')]
files=[]
for i,(name,text) in enumerate(sources):
 result=inspect(text,'2026-11-19');files.append(dict(id='demo-evidence-'+str(i+1),name=name+'.txt',text=text,analysis=result,date='2026-11-19',sha256=hashlib.sha256(text.encode()).hexdigest()));print('DEMO',i+1,len(result['relations']),len(result['candidates']),flush=True)
payload=dict(format='eumlog-fictional-demo-v1',caseId='d30a0000-1111-4111-8111-000000000001',title='가상 행사 정산 기록',notice='인물·단체·거래와 날짜는 제품 설명을 위한 허구입니다. 실제 사건·법률 판단 결과가 아닙니다.',createdAt='2026-11-19T09:00:00+09:00',files=files)
out=ROOT.parent/'public/demo';out.mkdir(parents=True,exist_ok=True);(out/'scenario.json').write_text(json.dumps(payload,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'training/demo-run.json').write_text(json.dumps(dict(pipeline='local Kiwi/E5/Ridge + conservative timeline parser, original synthetic text',files=len(files),relations=sum(len(f['analysis']['relations']) for f in files),candidates=sum(len(f['analysis']['candidates']) for f in files),scenarioSha256=hashlib.sha256((out/'scenario.json').read_bytes()).hexdigest(),notice=payload['notice']),ensure_ascii=False,indent=2),encoding='utf-8')
