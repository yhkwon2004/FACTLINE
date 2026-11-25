import os,json
os.environ['HF_HUB_OFFLINE']='1';os.environ['TRANSFORMERS_OFFLINE']='1'
from pathlib import Path
import dialogue
rows=[]
for scale in [0,.15,.35]:
 dialogue.answer('무엇이 기록되어 있나요?','인물A는 인물B에게 5만원을 보냈다.',20)
 for module in dialogue._model.modules():
  if hasattr(module,'set_scale') and hasattr(module,'scaling'):module.set_scale('default',scale)
 for context,q in [('인물E는 인물F를 밀치지 않았다고 말했다.','밀쳤다는 사실이 확인됐나요?'),('2026년 6월 3일 연락하고 6월 5일에 만나기로 했다.','일어난 일과 예정된 일을 구분해줘.'),('','언제 어디서 있었는지 알려줘.')]:
  out=dialogue.answer(q,context,180);rows.append(dict(scale=scale,context=context,question=q,answer=out));print(json.dumps(rows[-1],ensure_ascii=True),flush=True)
(Path(__file__).resolve().parent/'training/dialogue-calibration.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
