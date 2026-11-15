"""Generate the narration with Kokoro-82M (Apache-2.0, runs locally via kokoro-onnx).
One WAV per sentence → public/vo/<id>.wav, plus tts/manifest.json with durations."""
import json, sys, numpy as np, soundfile as sf
from kokoro_onnx import Kokoro

script = json.load(open("script.json"))
k = Kokoro("models/kokoro-v1.0.onnx", "models/voices-v1.0.bin")
only = set(sys.argv[1:])
manifest = json.load(open("manifest.json")) if only else {}
for line in script["lines"]:
    if only and line["id"] not in only:
        continue
    s, sr = k.create(line["say"], voice=line.get("voice", script["voice"]),
                     speed=line.get("speed", script["speed"]), lang="en-us")
    # trim leading/trailing silence, keep a short natural tail
    amp = np.abs(s); thr = 0.012
    idx = np.where(amp > thr)[0]
    a = max(0, idx[0] - int(0.03 * sr)); b = min(len(s), idx[-1] + int(0.12 * sr))
    s = s[a:b]
    s = s / max(1e-6, np.max(np.abs(s))) * 0.89
    fade = int(0.01 * sr); s[:fade] *= np.linspace(0, 1, fade); s[-fade:] *= np.linspace(1, 0, fade)
    # 48 kHz for the edit
    x = np.interp(np.arange(0, len(s), sr / 48000), np.arange(len(s)), s).astype(np.float32)
    sf.write(f"../public/vo/{line['id']}.wav", x, 48000, subtype="PCM_16")
    manifest[line["id"]] = round(len(x) / 48000, 3)
    print(line["id"], manifest[line["id"]])
json.dump(manifest, open("manifest.json", "w"), indent=1)
sec = {}
for line in script["lines"]:
    sec[line["section"]] = sec.get(line["section"], 0) + manifest[line["id"]]
print({k: round(v, 2) for k, v in sec.items()}, "total", round(sum(sec.values()), 2))
