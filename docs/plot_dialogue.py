"""Regenerate the report figure from the actual optimizer events using only Python."""
from pathlib import Path
import json
import math

ROOT = Path(__file__).resolve().parents[1]
run = json.loads((ROOT / "ai/training/dialogue-run.json").read_text(encoding="utf-8"))
events = run["events"]
assert [e["step"] for e in events] == list(range(1, run["steps"] + 1))
assert all(math.isfinite(e["loss"]) and e["loss"] >= 0 for e in events)
limit = max(1, math.ceil(max(e["loss"] for e in events)))
left, right, top, bottom = 64, 860, 48, 242
x = lambda step: left + (step - 1) * (right - left) / (len(events) - 1)
y = lambda loss: bottom - loss * (bottom - top) / limit
points = " ".join(f"{x(e['step']):.2f},{y(e['loss']):.2f}" for e in events)
lines = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 300" role="img" aria-labelledby="title desc">',
         '<title id="title">Qwen3-1.7B · 한국어 응답 어댑터 학습 손실</title>',
         f'<desc id="desc">{len(events):,}단계의 실제 손실을 기록 순서대로 표시했습니다. 세로축은 손실, 가로축은 최적화 단계입니다.</desc>',
         '<rect width="900" height="300" rx="16" fill="#f7f9fc"/>',
         '<g font-family="Pretendard,Malgun Gothic,Arial,sans-serif" font-size="14" fill="#415168">',
         '<text x="24" y="29" font-weight="700">Qwen3-1.7B · 단계별 학습 손실</text>']
for tick in range(limit + 1):
    lines.append(f'<path d="M{left} {y(tick):.2f}H{right}" stroke="#dce3eb"/><text x="48" y="{y(tick)+5:.2f}" text-anchor="end">{tick}</text>')
for step in (1, len(events) // 4, len(events) // 2, len(events) * 3 // 4, len(events)):
    lines.append(f'<text x="{x(step):.2f}" y="266" text-anchor="middle">{step:,}</text>')
lines.extend([f'<polyline points="{points}" fill="none" stroke="#1d58a6" stroke-width="1.25"/>',
              '<text x="462" y="289" text-anchor="middle">최적화 단계</text></g></svg>'])
(ROOT / "public/demo/dialogue-loss.svg").write_text("\n".join(lines) + "\n", encoding="utf-8")
