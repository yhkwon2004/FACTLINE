"""Check published data/run/weight consistency without starting inference."""
import json,hashlib,math
from pathlib import Path
ROOT=Path(__file__).resolve().parent
load=lambda name:json.loads((ROOT/name).read_text(encoding='utf-8'))
digest=lambda name:hashlib.sha256((ROOT/name).read_bytes()).hexdigest()
run=load('training/latest-run.json');rows=load('data/relation-supervision.json')
train=[x for x in rows if x['split']=='train'];test=[x for x in rows if x['split']=='test']
assert len(train)==run['metrics']['training']==816
assert len(test)==run['metrics']['testing']==157
assert not {x['text'] for x in train}&{x['text'] for x in test}
assert run['datasetSha256']==digest('data/relation-supervision.json')
assert run['modelSha256']==digest('models/relation_classifier.pkl')
matrix=run['metrics']['confusionMatrix']
assert sum(map(sum,matrix))==len(test)
assert abs(sum(row[i] for i,row in enumerate(matrix))/len(test)-run['metrics']['accuracy'])<1e-10
lora=load('training/lora-run.json');samples=load('training/lora-samples.json')
assert lora['samplesSha256']==digest('training/lora-samples.json')
assert lora['adapterSha256']==digest('models/adapter/adapter_model.safetensors')
assert len(samples)==len(lora['events'])==lora['model']['steps']==152
assert [e['step'] for e in lora['events']]==list(range(1,153))
assert all(math.isfinite(e['loss']) and e['loss']>=0 for e in lora['events'])
assert abs(sum(e['loss'] for e in lora['events'][-20:])/20-lora['model']['finalMeanTrainingLoss'])<1e-8
print('PASS actual dataset splits, evaluation counts, weights, 152 real LoRA losses and SHA-256 consistency')
