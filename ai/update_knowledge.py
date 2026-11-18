"""Resolve the current official statute version before downloading the full text."""
import json,requests,hashlib,re
from pathlib import Path
from bs4 import BeautifulSoup
from datetime import datetime
ROOT=Path(__file__).resolve().parent
DATA=ROOT/'data'
sources=json.loads((DATA/'sources.json').read_text(encoding='utf-8'))
sources=[s for s in sources if s['category']=='판례']
corpus=json.loads((DATA/'corpus.json').read_text(encoding='utf-8'))
corpus=[c for c in corpus if c['category']=='판례']
for sid,name in [('school-law','학교폭력예방및대책에관한법률'),('school-decree','학교폭력예방및대책에관한법률시행령'),('criminal-law','형법'),('civil-law','민법'),('privacy-law','개인정보보호법')]:
    canonical='https://www.law.go.kr/법령/'+name
    r=requests.get(canonical,timeout=60);r.raise_for_status();r.encoding=r.apparent_encoding
    soup=BeautifulSoup(r.text,'html.parser')
    hidden=soup.select_one('#lsiSeq') or soup.select_one('[name=lsiSeq]')
    if hidden is None: raise ValueError('법령 버전 확인 실패: '+name)
    seq=hidden.get('value')
    r=requests.get('https://www.law.go.kr/LSW/lsInfoR.do',params=dict(lsiSeq=seq,efYd=(soup.select_one('#frm_efYd') or soup.select_one('#ancYd')).get('value'),ancYnChk=0,chrClsCd='010202'),timeout=60)
    r.raise_for_status();r.encoding='utf-8'
    soup=BeautifulSoup(r.text,'html.parser')
    main=soup.select_one('#conScroll')
    if main is None: raise ValueError('법령 본문 없음: '+name)
    for x in main(['script','style','input','button']): x.decompose()
    text=main.get_text(' ',strip=True)
    text=re.sub(r'\\s+',' ',text)
    if len(text)<2000 or '제2조' not in text: raise ValueError('본문 검증 실패: '+name)
    (DATA/(sid+'.txt')).write_text(text,encoding='utf-8')
    sources.append(dict(id=sid,title=name,category='법령',url=r.url,canonicalUrl=canonical,sha256=hashlib.sha256(text.encode()).hexdigest(),characters=len(text),rights='대한민국 저작권법 제7조 법령',retrievedAt=datetime.now().isoformat()))
    for i in range(0,len(text),650):
        before=text[:i]
        articles=list(re.finditer(r'제[0-9]+조(?:의[0-9]+)?(?:\\([^)]+\\))?',before))
        article=articles[-1].group(0) if articles else '총칙'
        corpus.append(dict(id=f'{sid}-{i}',title=name,category='법령',content=text[max(0,i-120):i+650],sourceUrl=r.url,citation=name+' '+article+' 부근 (원문 대조 필요)'))
    print(name,len(text),flush=True)
(DATA/'corpus.json').write_text(json.dumps(corpus,ensure_ascii=False,indent=2),encoding='utf-8')
(DATA/'sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2),encoding='utf-8')
print('CORPUS_CHUNKS',len(corpus),flush=True)
