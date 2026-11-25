"""Reproducible public KLUE RE head. Entity spans are given, this is not NER."""
import json,hashlib,time,pickle,collections
from pathlib import Path
from datetime import datetime,timezone
import requests,pyarrow.parquet as pq
from learning import SemanticClassifier
from sklearn.metrics import accuracy_score,classification_report,confusion_matrix
ROOT=Path(__file__).resolve().parent
REV='349481ec73fff722f88e0453ca05c77a447d967c'
cache=ROOT/'models/klue';cache.mkdir(exist_ok=True)
labels=['no_relation','org:dissolved','org:founded','org:place_of_headquarters','org:alternate_names','org:member_of','org:members','org:political/religious_affiliation','org:product','org:founded_by','org:top_members/employees','org:number_of_employees/members','per:date_of_birth','per:date_of_death','per:place_of_birth','per:place_of_death','per:place_of_residence','per:origin','per:employee_of','per:schools_attended','per:alternate_names','per:parents','per:children','per:siblings','per:spouse','per:other_family','per:colleagues','per:product','per:religion','per:title']
manifest=[];splits={}
for split in ['train','validation']:
 url=f'https://huggingface.co/datasets/klue/klue/resolve/{REV}/re/{split}-00000-of-00001.parquet';file=cache/(split+'.parquet')
 if not file.exists():
  r=requests.get(url,timeout=120);r.raise_for_status();file.write_bytes(r.content)
 rows=pq.read_table(file).to_pylist();splits[split]=rows
 manifest.append(dict(url=url,sha256=hashlib.sha256(file.read_bytes()).hexdigest(),rows=len(rows)))
train=[];counts=collections.Counter()
for row in splits['train']:
 label=labels[row['label']]
 if counts[label]<400:train.append(row);counts[label]+=1
# Official validation split; text overlap is excluded, not claimed to be document-disjoint.
seen={r['sentence'] for r in splits['train']};test=[r for r in splits['validation'] if r['sentence'] not in seen]
def text(r):return f"주체: {r['subject_entity']['word']} / 대상: {r['object_entity']['word']} / 문장: {r['sentence']}"
start=time.time();model=SemanticClassifier();model.fit([text(r) for r in train],[labels[r['label']] for r in train])
pred=model.predict([text(r) for r in test]);out=ROOT/'models/korean-relations.pkl'
with out.open('wb') as f:pickle.dump(model,f)
metrics=dict(startedAt=datetime.now(timezone.utc).isoformat(),dataset='KLUE RE',revision=REV,license='CC-BY-SA-4.0',training=len(train),testing=len(test),availableTrain=len(splits['train']),availableValidation=len(splits['validation']),split='official split, exact sentence overlap excluded, max 400/train label',model='frozen multilingual-E5-small + fitted Ridge, subject/object supplied',accuracy=accuracy_score([labels[r['label']] for r in test],pred),perClass=classification_report([labels[r['label']] for r in test],pred,output_dict=True,zero_division=0),confusionMatrix=confusion_matrix([labels[r['label']] for r in test],pred,labels=model.classes_).tolist(),labels=list(model.classes_),modelSha256=hashlib.sha256(out.read_bytes()).hexdigest(),sources=manifest,seconds=round(time.time()-start,2),limitation='Entity pair classification on public benchmark; not end-to-end entity/actor extraction, legal or real-world accuracy.')
(ROOT/'training/korean-relations-run.json').write_text(json.dumps(metrics,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in metrics.items() if k not in ['perClass','confusionMatrix','sources']},ensure_ascii=False),flush=True)
