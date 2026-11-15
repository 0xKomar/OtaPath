import soundfile as sf
from kokoro_onnx import Kokoro
k = Kokoro("models/kokoro-v1.0.onnx", "models/voices-v1.0.bin")
text = "Golden light through the birch leaves, and a bird singing somewhere above me. The air feels soft and warm. I'm glad I came."
s, sr = k.create(text, voice="am_michael", speed=0.95, lang="en-us")
sf.write("../capture/assets/matti-voice-24k.wav", s, sr)
print(len(s)/sr)
