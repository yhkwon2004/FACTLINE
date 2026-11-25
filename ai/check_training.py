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

layout=load('training/layout-run.json');data=load('data/layout-supervision.json')
assert len(data)==600 and sum(g['split']=='train' for g in data)==480
assert layout['datasetSha256']==digest('data/layout-supervision.json')
assert layout['modelSha256']==hashlib.sha256((ROOT.parent/'src/domain/services/layout-ranker.json').read_bytes()).hexdigest()
assert all(len(g['layouts'])==6 for g in data)
print('PASS layout ranker data, graph-level holdout and browser model hash')

dialogue = load('training/dialogue-run.json')
samples = load('training/dialogue-samples.json')
assert dialogue['samplesSha256'] == digest('training/dialogue-samples.json')
assert dialogue['adapterSha256'] == digest('models/dialogue-adapter/adapter_model.safetensors')
assert len(samples) == dialogue['samples'] == 640
assert len(dialogue['events']) == dialogue['steps'] == len(samples) * dialogue['epochs']
assert all(e['step'] == i and math.isfinite(e['loss']) and e['loss'] >= 0
           for i, e in enumerate(dialogue['events'], 1))
assert math.isclose(dialogue['last20MeanLoss'], sum(e['loss'] for e in dialogue['events'][-20:]) / 20)
assert dialogue['sources'] == {p: sum(s['source'].startswith(p) for s in samples)
                               for p in ('synthetic', 'https://', 'KLUE')}

pairs = load('training/korean-pairs-run.json')
assert pairs['adapterSha256'] == digest('models/korean-pairs/adapter_model.safetensors')
assert pairs['headSha256'] == digest('models/korean-pairs/head.pt')
assert len(pairs['events']) == math.ceil(pairs['training'] / 16) * pairs['epochs']
assert math.isclose(sum(pairs['perClass'][label]['support'] for label in pairs['labels']), pairs['testing'])
print('PASS Korean dialogue samples and 1,280 loss values, public relation-pair evaluation and both checkpoints')

sources = load('data/sources.json')
corpus = load('data/corpus.json')
source_hashes = {s['url']: s['sha256'] for s in sources}
for s in sources:
    text = (ROOT / 'data' / (s['id'] + '.txt')).read_text(encoding='utf-8')
    assert hashlib.sha256(text.encode()).hexdigest() == s['sha256'], s['id']
assert all(c['sourceSha256'] == source_hashes[c['sourceUrl']] for c in corpus)
assert len(corpus) == load('models/metrics.json')['corpusChunks']

demo = load('../public/demo/scenario.json')
record = load('training/demo-run.json')
assert record['scenarioSha256'] == digest('../public/demo/scenario.json')
assert all(hashlib.sha256(f['text'].encode()).hexdigest() == f['sha256'] for f in demo['files'])
assert record['files'] == len(demo['files'])
for field in ('relations', 'candidates'):
    assert record[field] == sum(len(f['analysis'][field]) for f in demo['files'])
print('PASS official source snapshots, indexed citations and fictional evidence-to-demo hashes')
