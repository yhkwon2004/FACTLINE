from pathlib import Path
from transformers import WhisperProcessor,WhisperForConditionalGeneration
cache=str(Path(__file__).resolve().parent/'models/cache')
WhisperProcessor.from_pretrained('openai/whisper-small',cache_dir=cache)
WhisperForConditionalGeneration.from_pretrained('openai/whisper-small',cache_dir=cache)
print('WHISPER_READY')
