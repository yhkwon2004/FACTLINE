"""Small trained softmax classifier; TF-IDF features, PyTorch optimization."""
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.pipeline import FeatureUnion

class LearnedClassifier:
    def __init__(self):
        self.features=FeatureUnion([('words',TfidfVectorizer(ngram_range=(1,2),sublinear_tf=True)),('chars',TfidfVectorizer(analyzer='char',ngram_range=(2,5),sublinear_tf=True))])
    def fit(self,texts,labels):
        import torch
        torch.manual_seed(42)
        torch.set_num_threads(4)
        self.classes_=np.array(sorted(set(labels)))
        x=torch.tensor(self.features.fit_transform(texts).toarray(),dtype=torch.float32)
        y=torch.tensor([list(self.classes_).index(v) for v in labels])
        model=torch.nn.Linear(x.shape[1],len(self.classes_))
        optimizer=torch.optim.AdamW(model.parameters(),lr=0.025,weight_decay=0.03)
        for _ in range(180):
            optimizer.zero_grad();loss=torch.nn.functional.cross_entropy(model(x),y);loss.backward();optimizer.step()
        self.weight=model.weight.detach().numpy();self.bias=model.bias.detach().numpy()
        return self
    def predict_proba(self,texts):
        logits=self.features.transform(texts)@self.weight.T+self.bias
        logits-=logits.max(axis=1,keepdims=True); scores=np.exp(logits)
        return scores/scores.sum(axis=1,keepdims=True)
    def predict(self,texts):
        return self.classes_[self.predict_proba(texts).argmax(axis=1)]

class SemanticClassifier:
    def fit(self,texts,labels):
        from semantic import embed
        self.classes_=np.array(sorted(set(labels)))
        x=embed(texts)
        target=np.eye(len(self.classes_))[[list(self.classes_).index(v) for v in labels]]
        self.center=x.mean(0)
        centered=x-self.center
        self.weight=np.linalg.solve(centered.T@centered+0.05*np.eye(x.shape[1]),centered.T@target)
        self.prior=target.mean(0)
        return self
    def predict_proba(self,texts):
        from semantic import embed
        scores=((embed(texts)-self.center)@self.weight+self.prior)*5
        scores-=scores.max(axis=1,keepdims=True)
        values=np.exp(scores)
        return values/values.sum(axis=1,keepdims=True)
    def predict(self,texts):
        return self.classes_[self.predict_proba(texts).argmax(axis=1)]
