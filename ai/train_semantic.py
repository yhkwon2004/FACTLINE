import json,pickle
import numpy as np
from pathlib import Path
from semantic import embed
ROOT=Path(__file__).resolve().parent
rows=json.loads((ROOT/'data/supervision.json').read_text(encoding='utf-8'))
training=[x for x in rows if x['split']=='train']
testing=[x for x in rows if x['split']=='test']
# A fitted ridge head on frozen multilingual embeddings generalizes across word forms.
from learning import SemanticClassifier
head=SemanticClassifier()
head.fit([r['text'] for r in training],[r['label'] for r in training])
pred=head.predict([r['text'] for r in testing])
with (ROOT/'models/semantic_classifier.pkl').open('wb') as f: pickle.dump(head,f)
corpus=json.loads((ROOT/'data/corpus.json').read_text(encoding='utf-8'))
from kiwipiepy import Kiwi
from sklearn.feature_extraction.text import TfidfVectorizer
kiwi=Kiwi(num_workers=1)
vectorizer=TfidfVectorizer(ngram_range=(1,2),sublinear_tf=True)
matrix=vectorizer.fit_transform([' '.join(t.form for t in kiwi.tokenize(c['content']) if t.tag.startswith(('N','V','SL','SN'))) for c in corpus])
with (ROOT/'models/retrieval.pkl').open('wb') as f: pickle.dump((vectorizer,matrix),f)
np.save(ROOT/'models/corpus_embeddings.npy',embed([c['content'] for c in corpus],prefix='passage: '))
metrics=json.loads((ROOT/'models/metrics.json').read_text(encoding='utf-8'))
metrics.setdefault('lexicalAccuracy', 1/6)
metrics['accuracy']=float(np.mean(pred==np.array([r['label'] for r in testing])))
metrics['semanticEncoder']='intfloat/multilingual-e5-small (frozen)'
metrics['classifier']='Ridge fitted on E5 embeddings, alpha=0.05'
metrics['perClass']={label:dict(examples=sum(r['label']==label for r in testing),correct=sum(p==r['label'] for p,r in zip(pred,testing) if r['label']==label)) for label in head.classes_}
metrics['corpusChunks']=len(corpus)
(ROOT/'models/metrics.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(metrics,ensure_ascii=False),flush=True)
