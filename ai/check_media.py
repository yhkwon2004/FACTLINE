"""Offline extraction self-check, using generated fixtures only."""
import base64,io
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parent
fixtures=ROOT/'fixtures'
fixtures.mkdir(exist_ok=True)
font=ImageFont.truetype('C:/Windows/Fonts/malgun.ttf',26)
image=Image.new('RGB',(1000,440),'white')
draw=ImageDraw.Draw(image)
for i,line in enumerate(['기능 검증용 합성 대화','2026년 5월 12일 교실에서','민수가 팔을 때렸다고 기록했다.','실제 인물이나 사건이 아닙니다.']):
    draw.text((45,45+i*80),line,fill='#1c3032',font=font)
image.save(fixtures/'synthetic-message.png')
image.save(fixtures/'synthetic-scan.pdf','PDF',resolution=100)
from worker import extract,inspect
for name in ['synthetic-message.png','synthetic-scan.pdf']:
    b64=base64.b64encode((fixtures/name).read_bytes()).decode()
    result=extract(b64,name)
    assert '2026' in result['text'],result
    assert '민수' in result['text'],result
    print(name,result['method'],result['text'],flush=True)
check=inspect('민수가 때리지 않았다고 말했다. 날짜와 장소는 모른다.')
assert all(x['datetime'] is None for x in check['candidates'])
assert '때리지 않았' in check['text']
assert any(t['tag'].startswith('N') for t in check['tokens'])
day=inspect('2026년 5월 12일 교실에서 민수가 팔을 때렸다고 기록했다.')['candidates'][0]
assert day['isApproximateTime'] is True
precise=inspect('2026년 5월 12일 오후 3시 20분 교실에서 민수가 말했다.')['candidates'][0]
assert precise['datetime'].endswith('15:20:00+09:00') and not precise['isApproximateTime']
multilingual=inspect('학교에서 있었던 일을 기록하고 관련 자료를 확인하고 있습니다. This is a synthetic English message about a school incident.')
assert {'ko','en'}.issubset({x['language'] for x in multilingual['detectedLanguages']})
from semantic import embed
vectors=embed(['민수가 나의 팔을 때렸다.','Minsu hit my arm.','오늘 도서관에서 책을 읽었다.'])
assert float(vectors[0]@vectors[1])>float(vectors[0]@vectors[2])
print('SOURCE_TIME_AND_MULTILINGUAL_PASS',flush=True)
wav=fixtures/'synthetic-speech.wav'
if wav.exists():
    result=extract(base64.b64encode(wav.read_bytes()).decode(),wav.name)
    assert len(result['text'])>20,result
    print('SPEECH_PASS',result,flush=True)
