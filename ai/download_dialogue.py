from dialogue import ROOT, BASE, REVISION
from huggingface_hub import snapshot_download

snapshot_download(BASE, revision=REVISION, cache_dir=ROOT / 'models/cache',
                  allow_patterns=['*.json', '*.safetensors', '*.txt', '*.model', '*.jinja'])
print('Qwen3-1.7B downloaded',flush=True)
