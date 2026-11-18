# Local model notices

- Qwen/Qwen3-0.6B: Apache-2.0. https://huggingface.co/Qwen/Qwen3-0.6B
- EUMLOG extraction adapter: derived from Qwen3-0.6B; base-model terms apply. The adapter is actually trained in `train.py`.
- intfloat/multilingual-e5-small: MIT. https://huggingface.co/intfloat/multilingual-e5-small
- EasyOCR: Apache-2.0. https://github.com/JaidedAI/EasyOCR
- Kiwi/kiwipiepy: Apache-2.0. https://github.com/bab2min/kiwipiepy
- Whisper small: model card license Apache-2.0. https://huggingface.co/openai/whisper-small
- langdetect: Apache-2.0. https://github.com/Mimino666/langdetect
- Pretendard: SIL OFL; included in public/fonts/LICENSE.txt.
- pypdfium2 and bundled PDFium retain their upstream notices in the installed package.

Pretrained base weights are downloaded during setup, never requested from a hosted inference endpoint. The compact delivery archive includes the trained adapter, classifier and retrieval index; pretrained base weights and Python/Node environments remain in the installed local project and are excluded from the archive.

Statutory and judgment text sources are documented separately in data/sources.json. Synthetic consultations are authored test/training examples, not real person records.

- PyAV: BSD-3-Clause wrapper; bundled FFmpeg and enabled codecs have separate upstream license obligations. Check the installed wheel notices before redistributing a binary application. https://github.com/PyAV-Org/PyAV

The repository includes only the compact trained heads, LoRA adapter/tokenizer and retrieval artifacts. Base model caches, environments and user evidence remain excluded. Exact LoRA samples and run hashes are in training/.
