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

## 한국어 대화 어댑터와 공개 관계 데이터

- Qwen Team의 Qwen3-1.7B에 한국어 기록 정리용 LoRA를 추가했습니다. 기본 모델과 토크나이저는 Apache 2.0으로 제공됩니다. 사용한 버전은 `model-revisions.json`에, 변경된 가중치와 설정은 `models/dialogue-adapter/`에 있습니다. [Qwen3-1.7B 모델 카드](https://huggingface.co/Qwen/Qwen3-1.7B/tree/70d244cc86ccca08cf5af4e1e306ecf908b1ad5e) · [Apache 2.0](APACHE-2.0.txt)
- KLUE Benchmark 연구진의 **KLUE RE** 데이터에서 문장·두 개체·관계 레이블을 사용했습니다. Park et al.의 원저작물에서 120개 예시를 선별해 한국어 질문·답변을 추가했고 각 예시에 원래 GUID를 보존했습니다. 학습 자료는 `training/dialogue-samples.json`입니다. `source`가 KLUE로 시작하는 레코드와 이를 이용한 이 프로젝트의 대화 어댑터 및 연구용 개체쌍 분류 가중치(`models/korean-pairs/`)를 CC BY-SA 4.0으로 배포합니다. 각 기본 모델의 저작권 고지와 라이선스도 유지됩니다. [KLUE 연구 논문](https://arxiv.org/abs/2105.09680) · [고정한 데이터 버전](https://huggingface.co/datasets/klue/klue/tree/349481ec73fff722f88e0453ca05c77a447d967c/re) · [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
- 나머지 대화 학습 예시는 프로젝트에서 만든 합성 예시 400개와 국가법령정보센터 원문을 인용해 작성한 예시 120개입니다. 원문별 출처·해시·수집일을 확인할 수 있습니다. [법령·판례 출처 목록](data/sources.json)
- 브라우저는 공개 ONNX 변환 Whisper tiny 또는 small의 고정 리비전을 내려받아 기기에서 실행합니다. 변환 모델과 원본 모델의 출처를 함께 표기합니다. [ONNX tiny](https://huggingface.co/onnx-community/whisper-tiny/tree/ff4177021cc41f7db950912b73ea4fdf7d01d8e7) · [ONNX small](https://huggingface.co/onnx-community/whisper-small/tree/36050c46d777d46dc4b5f43f6d90574fc38f8732) · [Whisper tiny](https://huggingface.co/openai/whisper-tiny) · [Whisper small](https://huggingface.co/openai/whisper-small)
