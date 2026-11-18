"""Official E5 mean-pooling inference; pretrained weights stay local."""
from pathlib import Path
import os
import numpy as np
ROOT=Path(__file__).resolve().parent
_model=None; _tokenizer=None
def embed(texts,prefix='query: '):
    global _model,_tokenizer
    import torch
    from transformers import AutoModel,AutoTokenizer
    if _model is None:
        name='intfloat/multilingual-e5-small'
        offline=os.environ.get('HF_HUB_OFFLINE')=='1'
        _tokenizer=AutoTokenizer.from_pretrained(name,cache_dir=str(ROOT/'models/cache'),local_files_only=offline)
        _model=AutoModel.from_pretrained(name,cache_dir=str(ROOT/'models/cache'),local_files_only=offline).to('cuda' if torch.cuda.is_available() else 'cpu').eval()
    result=[]
    for start in range(0,len(texts),12):
        inputs=_tokenizer([prefix+x for x in texts[start:start+12]],max_length=512,truncation=True,padding=True,return_tensors='pt').to(_model.device)
        with torch.inference_mode():
            out=_model(**inputs).last_hidden_state
            mask=inputs['attention_mask'][...,None]
            pooled=(out*mask).sum(1)/mask.sum(1)
            result.append(torch.nn.functional.normalize(pooled,p=2,dim=1).cpu().numpy())
    return np.concatenate(result) if result else np.zeros((0,384),dtype=np.float32)
