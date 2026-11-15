import sys, numpy as np, soundfile as sf, matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
x, sr = sf.read(sys.argv[1]); m = x.mean(axis=1) if x.ndim > 1 else x
fig, ax = plt.subplots(2, 1, figsize=(16, 7), gridspec_kw={"height_ratios": [3, 1]})
ax[0].specgram(m, NFFT=4096, Fs=sr, noverlap=2048, cmap="magma", vmin=-110, vmax=-30)
ax[0].set_yscale("symlog", linthresh=200); ax[0].set_ylim(30, 16000)
w = int(sr * 0.05); r = np.sqrt(np.convolve(m ** 2, np.ones(w) / w, "same"))[::w]
ax[1].plot(np.arange(len(r)) * 0.05, 20 * np.log10(r + 1e-6)); ax[1].set_ylim(-50, 0); ax[1].set_xlim(0, len(m) / sr); ax[1].grid(alpha=.3)
plt.tight_layout(); plt.savefig(sys.argv[2], dpi=80)
