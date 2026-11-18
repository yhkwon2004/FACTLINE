"""Download public legal texts and create explicitly synthetic consultation supervision."""
import hashlib, json, re
from pathlib import Path
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent
DATA = ROOT / 'data'
DATA.mkdir(exist_ok=True)
SOURCES = [
    ('school-law', '학교폭력예방 및 대책에 관한 법률', '법령', 'https://www.law.go.kr/LSW/lsInfoR.do?lsiSeq=286361&efYd=20260602&ancYnChk=0&chrClsCd=010202'),
    ('precedent-213305', '학교폭력가해학생처분취소', '판례', 'https://www.law.go.kr/precInfoP.do?precSeq=213305'),
    ('precedent-609519', '학교폭력 조치 집행정지', '판례', 'https://law.go.kr/LSW/precInfoP.do?mode=0&precSeq=609519'),
]

def prepare():
    corpus, manifest = [], []
    for sid, title, category, url in SOURCES:
        response = requests.get(url, timeout=60)
        response.raise_for_status()
        response.encoding = response.apparent_encoding
        soup = BeautifulSoup(response.text, 'html.parser')
        for el in soup(['script', 'style', 'nav', 'header', 'footer']): el.decompose()
        main = soup.select_one('#contentBody') or soup.select_one('#conScroll') or soup.select_one('.pgroup') or soup
        text = re.sub(r'[ \t]+', ' ', main.get_text('\n', strip=True))
        lines = [x.strip() for x in text.splitlines() if len(x.strip()) > 25]
        text = '\n'.join(lines)
        if len(text) < 200 or (category == '법령' and '①' not in text): raise ValueError(f'원문 수집 실패: {title}, {len(text)}자')
        (DATA / f'{sid}.txt').write_text(text, encoding='utf-8')
        digest = hashlib.sha256(text.encode()).hexdigest()
        manifest.append(dict(id=sid, title=title, category=category, url=url, sha256=digest, characters=len(text), rights='대한민국 저작권법 제7조 법령·판결문. 사이트 UI 제외.', retrievedAt=__import__('datetime').datetime.now().isoformat()))
        for i in range(0, len(text), 650):
            part = text[max(0, i-100):i+650]
            corpus.append(dict(id=f'{sid}-{i}', title=title, category=category, content=part, sourceUrl=url, citation=f'{title} · 수집 원문 구간 {i//650+1}'))
    (DATA / 'corpus.json').write_text(json.dumps(corpus, ensure_ascii=False, indent=2), encoding='utf-8')
    (DATA / 'sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    # These are authored training examples, never presented as real victim consultations.
    actions = {
        '신체 피해': ['팔을 때렸다', '발로 다리를 찼다', '복도에서 밀쳤다', '머리를 잡아당겼다', '주먹으로 어깨를 쳤다', '가방으로 등을 때렸다', '몸을 벽으로 밀었다', '손목을 잡고 비틀었다'],
        '언어·협박': ['욕설을 했다', '신고하면 가만두지 않겠다고 말했다', '죽이겠다는 문자를 보냈다', '사람들 앞에서 모욕했다', '외모를 비하했다', '가족에게 해를 끼치겠다고 말했다', '나쁜 소문을 퍼뜨렸다', '단체방에서 비난했다'],
        '따돌림·사이버': ['단체방에서 나만 내보냈다', '게시판에 내 사진을 올렸다', '친구들에게 나와 말하지 말라고 했다', '반복해서 급식 자리를 피했다', '온라인에서 내 이름으로 글을 썼다', '모둠 활동에서 나만 제외했다', '허락 없이 내 동영상을 공유했다', '여러 명이 계속 무시했다'],
        '금품·강요': ['돈을 빌려 간 뒤 돌려주지 않았다', '만원을 내놓으라고 했다', '숙제를 대신 하라고 강요했다', '휴대폰을 빼앗았다', '강제로 심부름을 시켰다', '계좌로 돈을 보내라고 요구했다', '내 운동화를 가져갔다', '물건을 사오라고 협박했다'],
        '상담·정서': ['불안해서 잠이 오지 않는다', '상담 선생님과 이야기하고 싶다', '학교에 가는 것이 두렵다', '스트레스가 심하다', '마음이 힘들어 도움을 받고 싶다', '계속 눈물이 났다', '가슴이 답답하고 집중이 어렵다', '상담실을 방문했다'],
        '일반 기록': ['도서관에서 책을 읽었다', '친구와 점심을 먹었다', '운동장에서 축구를 했다', '선생님께 숙제를 냈다', '버스를 타고 집에 갔다', '학원에서 수업을 들었다', '내일 일정을 메모했다', '가족과 산책했다'],
    }
    rows = []
    for label, phrases in actions.items():
        for family, action in enumerate(phrases):
            for variant in range(10):
                actor = ['민수', '지훈', 'A 학생', '상대방', '친구'][variant % 5]
                place = ['교실', '복도', '운동장', '단체 대화방', '급식실'][variant % 5]
                date = f'2026년 {variant%6+3}월 {variant+2}일'
                text = f'{date} {place}에서 {actor}가 {action}.'
                output = dict(title=action, cleanedStatement=text, datetime=None, approximateTimeText=date, location=place, actor=actor, action=action, damage=None, followUpQuestions=['관련 원본 자료나 목격자가 있나요?'])
                rows.append(dict(text=text, label=label, family=f'{label}-{family}', split='test' if family >= 6 else 'train', output=output, provenance='자체 작성 합성 상담 예시 · 실제 상담기록 아님'))
    (DATA / 'supervision.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(dict(chunks=len(corpus), sources=len(manifest), synthetic=len(rows)), ensure_ascii=False))

if __name__ == '__main__': prepare()
