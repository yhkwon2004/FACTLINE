import os
os.environ['HF_HUB_OFFLINE']='1';os.environ['TRANSFORMERS_OFFLINE']='1'
from kiwipiepy import Kiwi
from relations import extract_relations
k=Kiwi(num_workers=1)
def one(text):
 result=extract_relations(text,k);assert result,text;return result[0]
r=one('김민수는 박지훈에게 5만원을 송금했다.');assert (r['actor'],r['target'],r['amount'])==('김민수','박지훈','5만원'),r
r=one('박지훈은 김민수에게 맞았다.');assert (r['actor'],r['target'])==('김민수','박지훈'),r
r=one('김민수는 박지훈을 때리지 않았다.');assert r['polarity']=='denied',r
r=one('김민수는 박지훈에게 5만원을 주겠다고 했다.');assert r['polarity'] in ('uncertain','planned'),r
assert not extract_relations('사건이 발생했다. 자료는 보관되어 있다.',k)
r=one('🙂 김민수는 박지훈에게 연락했다.'); raw='🙂 김민수는 박지훈에게 연락했다.';assert raw.encode('utf-16-le')[r['sourceSpan']['start']*2:r['sourceSpan']['end']*2].decode('utf-16-le')==r['quote']
for r in extract_relations('김민수는 박지훈에게 5만원을 송금했다. 김민수는 박지훈을 때리지 않았다.',k):
 assert r['actor'] in r['quote'] and (not r['target'] or r['target'] in r['quote']) and r['action'] in r['quote']
print('PASS actual learned relation inference, source spans, passive direction, denial, planned actions and Unicode offsets')

r=one('김민수는 박지훈을 밀치지 않았다고 말했다.');assert r['polarity']=='denied' and r['target']=='박지훈',r
r=one('김민수는 박지훈에게 돈을 보내겠다고 말했다.');assert r['polarity']=='planned' and r['target']=='박지훈',r
r=one('김민수는 박지훈에게 가만두지 않겠다고 협박했다.');assert r['polarity']!='denied',r
r=one('김민수는 박지훈이 돈을 받았다는 이야기를 들었다.');assert r['polarity']=='uncertain' and r['target'] is None,r
print('PASS direct denial, promise recipient, negative threat wording and indirect speech')
