"""Index saved official statutes by article; add explicitly curated official judgments."""
import json,re,hashlib,pickle
from datetime import datetime,timezone
from pathlib import Path
import requests,numpy as np
from bs4 import BeautifulSoup
from kiwipiepy import Kiwi
from sklearn.feature_extraction.text import TfidfVectorizer
from semantic import embed
ROOT=Path(__file__).resolve().parent;DATA=ROOT/'data';MODEL=ROOT/'models'
sources=json.loads((DATA/'sources.json').read_text(encoding='utf-8'))
for seq,title in [('158543','사기 · 대법원 2011도8829'),('614371','손해배상(기) · 대법원 2025다211430')]:
    sid='precedent-'+seq;url='https://www.law.go.kr/precInfoP.do?precSeq='+seq
    r=requests.get(url,timeout=60);r.raise_for_status();r.encoding='utf-8'
    soup=BeautifulSoup(r.text,'html.parser');main=soup.select_one('#contentBody')
    if main is None:raise ValueError('Official judgment body missing: '+seq)
    for x in main(['script','style','button','input']):x.decompose()
    text=main.get_text('\n',strip=True)
    assert len(text)>1000 and '판결' in text and '판결요지' in text
    (DATA/(sid+'.txt')).write_text(text,encoding='utf-8')
    sources=[s for s in sources if s['id']!=sid]
    sources.append(dict(id=sid,title=title,category='판례',url=url,sha256=hashlib.sha256(text.encode()).hexdigest(),characters=len(text),rights='대한민국 저작권법 제7조 판결문. 사이트 UI 제외.',retrievedAt=datetime.now(timezone.utc).isoformat()))
corpus=[]
for s in sources:
    text=(DATA/(s['id']+'.txt')).read_text(encoding='utf-8')
    assert hashlib.sha256(text.encode()).hexdigest()==s['sha256']
    headings=list(re.finditer(r'제\d+조(?:의\d+)?\s*\([^)\n]{1,100}\)',text)) if s['category']=='법령' else []
    sections=[(m.group(),text[m.start():headings[i+1].start() if i+1<len(headings) else len(text)]) for i,m in enumerate(headings)] if headings else [('판결 원문',text)]
    for n,(heading,body) in enumerate(sections):
        for offset in range(0,len(body),1100):
            content=body[max(0,offset-100):offset+1100]
            corpus.append(dict(id=f'{s["id"]}-{n}-{offset}',title=s['title'],category=s['category'],content=content,sourceUrl=s['url'],citation=s['title']+' '+heading+(f' · 원문 구간 {offset//1100+1}' if not headings or len(body)>1100 else ''),sourceSha256=s['sha256']))
assert any('제347조' in c['citation'] and c['title']=='형법' for c in corpus)
kiwi=Kiwi(num_workers=1);v=TfidfVectorizer(ngram_range=(1,2),sublinear_tf=True)
matrix=v.fit_transform([' '.join(t.form for t in kiwi.tokenize(c['content']) if t.tag.startswith(('N','V','SL','SN'))) for c in corpus])
with (MODEL/'retrieval.pkl').open('wb') as f:pickle.dump((v,matrix),f)
np.save(MODEL/'corpus_embeddings.npy',embed([c['content'] for c in corpus],prefix='passage: '))
(DATA/'corpus.json').write_text(json.dumps(corpus,ensure_ascii=False,indent=2),encoding='utf-8')
(DATA/'sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2),encoding='utf-8')
metrics=json.loads((MODEL/'metrics.json').read_text(encoding='utf-8'));metrics['corpusChunks']=len(corpus)
(MODEL/'metrics.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(sources=len(sources),statutes=sum(s['category']=='법령' for s in sources),judgments=sum(s['category']=='판례' for s in sources),chunks=len(corpus)),ensure_ascii=False))
