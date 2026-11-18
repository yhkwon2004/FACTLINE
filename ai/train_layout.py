"""Learn a tiny layout ranker from disclosed procedural geometric preferences."""
import json,math,random,hashlib
from pathlib import Path
from datetime import datetime,timezone
import numpy as np
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
ROOT=Path(__file__).resolve().parent
FEATURES=['node_overlap','edge_crossing','label_overlap','mean_length','length_variation','area','aspect','density']

def features(points,edges):
    n=len(points);pairs=max(1,n*(n-1)/2)
    overlap=sum(abs(a[0]-b[0])<190 and abs(a[1]-b[1])<200 for i,a in enumerate(points) for b in points[i+1:])/pairs
    def orient(a,b,c):return (b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])
    cross=0
    for i,(a,b) in enumerate(edges):
        for c,d in edges[i+1:]:
            if len({a,b,c,d})==4 and orient(points[a],points[b],points[c])*orient(points[a],points[b],points[d])<0 and orient(points[c],points[d],points[a])*orient(points[c],points[d],points[b])<0:cross+=1
    mids=[((points[a][0]+points[b][0])/2,(points[a][1]+points[b][1])/2) for a,b in edges]
    labels=sum(abs(a[0]-b[0])<150 and abs(a[1]-b[1])<65 for i,a in enumerate(mids) for b in mids[i+1:])/max(1,len(edges)*(len(edges)-1)/2)
    lengths=[math.dist(points[a],points[b])/350 for a,b in edges];mean=sum(lengths)/max(1,len(lengths))
    variation=sum((v-mean)**2 for v in lengths)/max(1,len(lengths))
    w=max(p[0] for p in points)-min(p[0] for p in points)+190;h=max(p[1] for p in points)-min(p[1] for p in points)+200
    return [overlap,cross/max(1,len(edges)*(len(edges)-1)/2),labels,mean,variation,w*h/(n*350*350),abs(math.log(w/h)),len(edges)/max(1,n)]

def candidates(n,edges):
    degree=[0]*n
    for a,b in edges:degree[a]+=1;degree[b]+=1
    order=sorted(range(n),key=lambda i:(-degree[i],i));cols=max(2,math.ceil(math.sqrt(n)))
    layouts=[]
    for mode in range(6):
        points=[None]*n
        for rank,i in enumerate(order):
            if mode==0:p=(650,160) if rank==0 else (230+((rank-1)%3)*360,470+((rank-1)//3)*330)
            elif mode==1:p=(210+(rank%3)*380,180+(rank//3)*310)
            elif mode==2:p=(180+(rank%cols)*330,180+(rank//cols)*300)
            elif mode==3:
                angle=rank/max(1,n)*math.pi*2;radius=max(360,n*48);p=(radius+200+math.cos(angle)*radius,radius+200+math.sin(angle)*radius)
            elif mode==4:p=(200+(rank%2)*420,180+(rank//2)*280)
            else:p=(210+(rank//3)*380,180+(rank%3)*310)
            points[i]=p
        layouts.append(points)
    return layouts

def main():
    rng=random.Random(61);graphs=[];rows=[];started=datetime.now(timezone.utc).isoformat()
    for i in range(600):
        n=rng.randint(3,14);edges=[(j,rng.randrange(j)) for j in range(1,n)]
        for _ in range(rng.randint(0,n)):
            a,b=rng.sample(range(n),2)
            if (a,b) not in edges and (b,a) not in edges:edges.append((a,b))
        entries=[]
        for mode,points in enumerate(candidates(n,edges)):
            scale=rng.uniform(.6,1.15)
            points=[(round(p[0]*scale+rng.uniform(-75,75),3),round(p[1]*scale+rng.uniform(-75,75),3)) for p in points]
            x=features(points,edges)
            # Procedural layout objectives, not human aesthetics or legal facts.
            quality=-7*math.sqrt(x[0])-5*x[1]-3*x[2]-.32*x[3]-.08*x[4]-.06*x[5]-.13*x[6]
            entries.append(dict(mode=mode,points=points,features=x,quality=quality))
        graph=dict(id=i,split='train' if i<480 else 'test',nodes=n,edges=edges,layouts=entries);graphs.append(graph)
        rows.extend((e['features'],e['quality'],graph['split']) for e in entries)
    x=np.array([r[0] for r in rows if r[2]=='train']);y=np.array([r[1] for r in rows if r[2]=='train'])
    scaler=StandardScaler().fit(x);model=Ridge(alpha=.5).fit(scaler.transform(x),y)
    testing=[g for g in graphs if g['split']=='test'];agree=0;regret=[]
    for g in testing:
        predicted=model.predict(scaler.transform([e['features'] for e in g['layouts']]))
        chosen=int(predicted.argmax());best=max(e['quality'] for e in g['layouts']);agree+=chosen==max(range(6),key=lambda j:g['layouts'][j]['quality']);regret.append(best-g['layouts'][chosen]['quality'])
    dataset=ROOT/'data/layout-supervision.json';dataset.write_text(json.dumps(graphs,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    weights=dict(version=1,model='standardized Ridge layout preference ranker',features=FEATURES,mean=scaler.mean_.tolist(),scale=scaler.scale_.tolist(),weights=model.coef_.tolist(),bias=float(model.intercept_),trainedGraphs=480,testGraphs=120,candidates=6,provenance='Procedural synthetic graphs and geometric preference labels; no user evidence or human preference labels')
    target=ROOT.parent/'src/domain/services/layout-ranker.json';target.write_text(json.dumps(weights,indent=2),encoding='utf-8')
    fixture=dict(points=graphs[0]['layouts'][0]['points'],edges=graphs[0]['edges'],features=graphs[0]['layouts'][0]['features'])
    (ROOT/'training/layout-parity.json').write_text(json.dumps(fixture,indent=2),encoding='utf-8')
    run=dict(startedAt=started,completedAt=datetime.now(timezone.utc).isoformat(),seed=61,trainingGraphs=480,heldOutGraphs=120,trainingLayouts=2880,heldOutLayouts=720,top1Agreement=agree/120,meanOracleRegret=float(np.mean(regret)),datasetSha256=hashlib.sha256(dataset.read_bytes()).hexdigest(),modelSha256=hashlib.sha256(target.read_bytes()).hexdigest(),limitation='Agreement with a synthetic geometric oracle, not real diagrams, human taste, entity extraction or legal accuracy.')
    (ROOT/'training/layout-run.json').write_text(json.dumps(run,indent=2),encoding='utf-8');print(json.dumps(run))
if __name__=='__main__':main()
