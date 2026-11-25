"""Acquire curated official originals with version dates and hashes, not commercial summaries."""
import json,re,hashlib
from pathlib import Path
from datetime import datetime,timezone
from urllib.parse import quote
import requests
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parent;DATA=ROOT/'data';sources=json.loads((DATA/'sources.json').read_text(encoding='utf-8'))
statutes=[('labor-law','근로기준법'),('retirement-law','근로자퇴직급여보장법'),('stalking-law','스토킹범죄의처벌등에관한법률'),('network-law','정보통신망이용촉진및정보보호등에관한법률'),('communications-law','통신비밀보호법'),('sexual-violence-law','성폭력범죄의처벌등에관한특례법')]
def get(url):
 r=requests.get(url,timeout=90);r.raise_for_status();r.encoding='utf-8';return BeautifulSoup(r.text,'html.parser')
for sid,title in statutes:
 canonical='https://www.law.go.kr/법령/'+quote(title);shell=get(canonical)
 values={e.get('name'):e.get('value') for e in shell.select('input[name]')};seq=values.get('lsiSeq');date=values.get('efYd')
 if not seq or not re.fullmatch(r'\d{8}',date or ''):raise ValueError('Missing official version: '+title)
 url='https://www.law.go.kr/LSW/lsInfoR.do?lsiSeq='+seq+'&efYd='+date+'&ancYnChk=0&chrClsCd=010202'
 body=get(url);groups=body.select('#conScroll .pgroup');assert len(groups)>3,title
 for group in groups:
  for tag in group.select('script,style,button,input,label,select'):tag.decompose()
 text='\n'.join(g.get_text(' ',strip=True) for g in groups)
 assert '제1조' in text and len(text)>1000,title
 (DATA/(sid+'.txt')).write_text(text,encoding='utf-8');sources=[s for s in sources if s['id']!=sid];sources.append(dict(id=sid,title=title,category='법령',url=url,canonicalUrl=canonical,effectiveDate=date,lsiSeq=seq,sha256=hashlib.sha256(text.encode()).hexdigest(),characters=len(text),rights='대한민국 저작권법 제7조 법령 원문. 사이트 UI 제외.',retrievedAt=datetime.now(timezone.utc).isoformat(),selector='#conScroll .pgroup'))
 print('STATUTE',sid,len(text),date,flush=True)
for seq in ['144855','214439','226627']:
 sid='precedent-'+seq;url='https://www.law.go.kr/precInfoP.do?precSeq='+seq;body=get(url);main=body.select_one('#contentBody');assert main is not None
 for tag in main.select('script,style,button,input,select'):tag.decompose()
 text=main.get_text('\n',strip=True);assert '판결' in text and len(text)>1000
 title=body.title.get_text(' ',strip=True).split('|')[0].strip();(DATA/(sid+'.txt')).write_text(text,encoding='utf-8');sources=[s for s in sources if s['id']!=sid];sources.append(dict(id=sid,title=title,category='판례',url=url,sha256=hashlib.sha256(text.encode()).hexdigest(),characters=len(text),rights='대한민국 저작권법 제7조 판결 원문. 사이트 UI 제외.',retrievedAt=datetime.now(timezone.utc).isoformat()))
 print('JUDGMENT',seq,len(text),flush=True)
(DATA/'sources.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2),encoding='utf-8')
