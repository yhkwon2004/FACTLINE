"""Bounded in-memory phone recording decoding; never opens referenced URLs or files."""
import io
import numpy as np
MAX_SECONDS=1200
AUDIO_SUFFIXES={'.wav','.mp3','.flac','.ogg','.m4a','.aac','.mp4','.webm','.opus','.3gp'}
def decode_audio(blob):
    import av
    frames=[]; samples=0
    try:
        with av.open(io.BytesIO(blob),options={'protocol_whitelist':'pipe','format_whitelist':'wav,mp3,flac,ogg,mov,matroska,webm,aac,amr'}) as container:
            if not container.streams.audio: raise ValueError('녹음에서 오디오 트랙을 찾지 못했습니다.')
            if container.duration and container.duration/av.time_base>MAX_SECONDS+1: raise ValueError('녹음은 20분 이하로 나누어 주세요.')
            resampler=av.AudioResampler(format='fltp',layout='mono',rate=16000)
            for frame in container.decode(container.streams.audio[0]):
                for result in resampler.resample(frame):
                    data=result.to_ndarray().reshape(-1).astype(np.float32,copy=False); samples+=len(data)
                    if samples>MAX_SECONDS*16000: raise ValueError('녹음은 20분 이하로 나누어 주세요.')
                    frames.append(data)
            for result in resampler.resample(None):
                data=result.to_ndarray().reshape(-1).astype(np.float32,copy=False); samples+=len(data)
                if samples>MAX_SECONDS*16000: raise ValueError('녹음은 20분 이하로 나누어 주세요.')
                frames.append(data)
    except ValueError: raise
    except Exception as error: raise ValueError('녹음 파일을 읽을 수 없습니다. M4A, WAV, MP3, WebM 파일을 확인해 주세요.') from error
    if not samples: raise ValueError('비어 있는 녹음입니다.')
    audio=np.concatenate(frames)
    if not np.isfinite(audio).all(): raise ValueError('녹음 샘플이 유효하지 않습니다.')
    return audio
