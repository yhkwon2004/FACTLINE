"""Actual bounded phone-container decoding and offline Whisper regression check."""
import io,json
from pathlib import Path
import av,numpy as np
from audio import decode_audio
ROOT=Path(__file__).resolve().parent
source=(ROOT/'fixtures/synthetic-korean.wav').read_bytes()
audio=decode_audio(source)
assert len(audio)>16000 and np.isfinite(audio).all()
for fmt,codec in [('mp4','aac'),('webm','libopus')]:
    buffer=io.BytesIO()
    with av.open(buffer,'w',format=fmt) as container:
        stream=container.add_stream(codec,rate=48000)
        stream.layout='mono'
        resampler=av.AudioResampler(format='fltp',layout='mono',rate=48000)
        frame=av.AudioFrame.from_ndarray(audio.reshape(1,-1),format='fltp',layout='mono');frame.sample_rate=16000
        for f in resampler.resample(frame)+resampler.resample(None):
            for packet in stream.encode(f):container.mux(packet)
        for packet in stream.encode(None):container.mux(packet)
    decoded=decode_audio(buffer.getvalue())
    assert abs(len(decoded)-len(audio))<2400,(fmt,len(decoded),len(audio))
    if fmt=='mp4': (ROOT/'fixtures/synthetic-korean.m4a').write_bytes(buffer.getvalue())
for blob in [b'',b'invalid',b'#EXTM3U\n#EXTINF:1,\nhttps://example.test/private.wav']:
    try:decode_audio(blob)
    except ValueError:pass
    else:raise AssertionError('Invalid or referenced content accepted')
from worker import transcribe,inspect
result=transcribe((ROOT/'fixtures/synthetic-korean.m4a').read_bytes())
assert result['segments'] and not result['text'].startswith('[')
assert all(0<=s['start']<=s['end']<=result['duration']+.1 for s in result['segments'])
checked=inspect('오늘 김민수가 이서연에게 5만원을 송금했다.','2026-11-18',[dict(start=2,end=6,text='오늘 김민수가 이서연에게 5만원을 송금했다.')])
assert checked['candidates'][0]['datetime'].startswith('2026-11-18')
assert checked['candidates'][0]['audioRange']['start']==2
assert checked['candidates'][0]['isApproximateTime']
assert inspect('김민수가 이서연에게 5만원을 송금했다.')['candidates'][0]['datetime'] is None
report=dict(check='WAV / AAC-M4A / Opus-WebM decode; invalid and playlist rejection; actual local Whisper; date vs recording offset',duration=result['duration'],segments=result['segments'],synthetic=True)
(ROOT/'training/audio-check.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
