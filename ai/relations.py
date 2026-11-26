"""Grounded Korean role spans plus a fitted semantic relation-type classifier."""
import json,pickle,re
from pathlib import Path
ROOT=Path(__file__).resolve().parent
_head=None
LABELS={'payment':'금전','violence':'신체접촉','threat':'위협','communication':'연락·대화','family':'가족','work':'소속·업무','other':'기타'}
SUBJECT={'은','는','이','가','께서'}
TARGET={'에게','한테','께','을','를','와','과','에','의'}
ORG=re.compile(r'(?:회사|학교|센터|법인|팀|기관|은행|병원)$')
AMBIGUOUS={'나','너','저','본인','그','그녀','상대','상대방','우리','회사','학교'}
def mentions(sentence,kiwi):
    ts=kiwi.tokenize(sentence); found=[]
    for part in ts:
        if part.form not in SUBJECT|TARGET or not part.tag.startswith('J'): continue
        match=re.search(r'([가-힣A-Za-z][가-힣A-Za-z0-9·._-]{0,24}(?:\s+(?:회사|센터|학교|팀))?)$',sentence[:part.start])
        if not match:continue
        start,end=match.span(1); surface=sentence[start:end]
        local=[t for t in ts if t.start>=start and t.start<end]
        proper=any(t.tag.startswith(('NNP','NP','SL')) for t in local)
        if not proper and not ORG.search(surface):continue
        if surface in {'사건','자료','기록','대화','내용','정보','인물','이름','날짜','시간','오늘','어제'}:continue
        found.append(dict(text=surface,start=start,end=end,particle=part.form,kind='organization' if ORG.search(surface) else 'person',ambiguous=surface in AMBIGUOUS or bool(re.fullmatch(r'[A-Z가-힣]씨|[가-힣]{1,2}모씨',surface))))
    return found,ts

def classify(sentences):
    global _head
    if _head is None:
        with (ROOT/'models/relation_classifier.pkl').open('rb') as f:_head=pickle.load(f)
    return _head.classes_,_head.predict_proba(sentences)

def extract_relations(text,kiwi):
    sentences=[s for s in kiwi.split_into_sents(text[:60000]) if s.text.strip()][:90]
    if not sentences:return []
    labels,scores=classify([s.text for s in sentences]); results=[]
    for index,(source,probs) in enumerate(zip(sentences,scores)):
        sentence=source.text; names,ts=mentions(sentence,kiwi)
        if not names:continue
        best=int(probs.argmax()); kind=str(labels[best]); confidence=float(probs[best])
        subjects=[m for m in names if m['particle'] in SUBJECT]
        actor=subjects[0] if subjects else None
        targets=[m for m in names if m['particle'] in TARGET and (not actor or m['text']!=actor['text'])]
        target=next((m for m in targets if m['particle'] in {'에게','한테','께'}),None) or next((m for m in targets if m['particle'] in {'을','를','와','과'}),None)
        if kind in {'family','work'}: target=target or next((m for m in targets if m['particle'] in {'의','에'}),None)
        if kind=='family' and not target and len({m['text'] for m in names})==2:
            actor=names[0];target=next(m for m in names if m['text']!=actor['text'])
        if not actor:continue
        boundary=max(actor['end'],target['end'] if target else actor['end'])
        verbs=[t for t in ts if t.start>=boundary and t.tag in {'VV','VA','XSV','XSA','VCP'}]
        predicate=verbs[0] if verbs else None; action_start=predicate.start if predicate else boundary
        if predicate and predicate.tag in {'XSV','XSA','VCP'}:
            before=[t for t in ts if t.start<action_start and t.start>=boundary and t.tag.startswith('N')]
            if before:action_start=before[-1].start
        # The comitative party to a contract is not the recipient of a transfer.
        mutual_contract = None
        if target and target['particle'] in {'와','과'} and sentence[action_start:].startswith(('맺','체결')):
            mutual_contract = re.search(r'계약(?:을)?\s*$', sentence[boundary:action_start])
            if mutual_contract:
                action_start = boundary + mutual_contract.start()
        action=sentence[action_start:].strip(' .!?\n')[:60] or LABELS[kind]+' 언급'
        denied=bool(re.search(r'지\s*않|지\s*못|아니|(?:^|\s)안\s|없었다|부인(?:했|하였|한다|하는|한\s)|하지\s*않',sentence))
        if kind=='threat' and re.search(r'협박|위협',action) and not re.search(r'(?:협박|위협)(?:하|을\s*하|를\s*하)?지\s*않|협박한\s*적.*없|위협한\s*적.*없',action):denied=False
        hearsay=bool(re.search(r'전해\s*들|소문|전언|(?:[다라]고|(?:이야기|얘기|소식|말)(?:를|을)?)\s*들[었은으]',sentence))
        uncertain=bool(re.search(r'같다|같았다|듯|의혹|추정|모르|확인되지|했는지|인가요|\?',sentence))
        planned=bool(re.search(r'겠|예정|기로|달라|요청|부탁',action)) and not denied
        # The relation classifier scores the action category. Attribution comes from the wording.
        polarity='uncertain' if hearsay or len(subjects)>1 else 'denied' if denied else 'planned' if planned else 'uncertain' if uncertain else 'reported'
        if target and re.search(r'맞았|폭행당|협박당',action):actor,target=target,actor
        if target and kind=='payment' and re.search(r'받았다|받았다고|수령했다',action):actor,target=target,actor
        # Embedded testimony and unclear subjects retain the quote without inventing an interpersonal direction.
        if hearsay or len(subjects)>1:target=None
        amount=re.search(r'(?:\d[\d,.]*\s*(?:억|천|만)?|[일이삼사오육칠팔구십백천만억]+)\s*원',sentence)
        start=getattr(source,'start',text.find(sentence));utf_start=len(text[:start].encode('utf-16-le'))//2
        unique=list({m['text']:m for m in names}.values())
        results.append(dict(id='r'+str(index),candidateId=str(index),actor=actor['text'],target=target['text'] if target else None,actorKind=actor['kind'],targetKind=target['kind'] if target else None,actorAmbiguous=actor['ambiguous'],targetAmbiguous=target['ambiguous'] if target else False,action=action,kind=kind,typeLabel=LABELS[kind],score=round(confidence,3),polarity=polarity,directed=kind!='family' and not mutual_contract and target is not None,amount=amount.group(0) if amount else None,quote=sentence,sourceSpan=dict(start=utf_start,end=utf_start+len(sentence.encode('utf-16-le'))//2),mentions=[{k:v for k,v in m.items() if k in {'text','kind','ambiguous'}} for m in unique],model='E5 + fitted relation Ridge; Kiwi source spans'))
    return results
