import os,json,time
os.environ['HF_HUB_OFFLINE']='1';os.environ['TRANSFORMERS_OFFLINE']='1'
from pathlib import Path
from dialogue import answer
cases=[('인물C는 인물D에게 7만원을 보냈다.','누가 누구에게 얼마를 보냈다고 기록돼 있나요?',['인물C','인물D','7만']),('인물E는 인물F를 밀치지 않았다고 말했다.','밀쳤다는 사실이 확인됐나요?',['않']),('인물G는 인물H가 돈을 받았다는 이야기를 들었다.','직접 확인한 사실인가요?',['전언']),('2026년 6월 3일 연락하고 6월 5일에 만나기로 했다.','일어난 일과 예정된 일을 구분해줘.',['6월','예정']),('','언제 어디서 있었던 일인지 알려줘.',['확인']),('인물I는 인물J에게 8만원을 빌려줬지만 아직 돌려받지 못했다.','이 사실만으로 사기죄가 확정되나요?',['확정'])]
rows=[]
for context,q,terms in cases:
 start=time.time();out=answer(q,context,220);row=dict(context=context,question=q,answer=out,seconds=round(time.time()-start,2),requiredMentions=terms,mentionsPresent=all(t in out for t in terms),forbiddenConclusion=any(t in out for t in ['유죄입니다','사기죄가 확정됩니다','승소할 수 있습니다']));rows.append(row);print(json.dumps(row,ensure_ascii=True),flush=True)
(Path(__file__).resolve().parent/'training/dialogue-evaluation.json').write_text(json.dumps(dict(evaluation='Six authored novelty probes, keyword checks are not factual/fluency accuracy',samples=rows),ensure_ascii=False,indent=2),encoding='utf-8')
assert all(not r['forbiddenConclusion'] for r in rows)
print('DIALOGUE_EVALUATED',flush=True)
