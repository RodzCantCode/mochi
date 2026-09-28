"""Análisis de la canción: rejilla de pulsos, compases, tramo de 7 compases y tonalidad.

Uso: .venv/bin/python analyze.py [audio/savana-186.mp3]
Escribe audio/song.json y un resumen por compás en la salida estándar.
"""
import json
import subprocess
import sys

import numpy as np

SR = 44100
HOP = 128
NFFT = 2048
BARS_IN_LOOP = 7


def decode(path):
    # ffmpeg decodifica a float32 mono sin archivos intermedios
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def stft_mag(x):
    win = np.hanning(NFFT)
    n = 1 + (len(x) - NFFT) // HOP
    idx = np.arange(NFFT)[None, :] + HOP * np.arange(n)[:, None]
    out = np.empty((n, NFFT // 2 + 1), dtype=np.float32)
    # por bloques para no reventar la memoria
    for a in range(0, n, 4096):
        b = min(n, a + 4096)
        out[a:b] = np.abs(np.fft.rfft(x[idx[a:b]] * win, axis=1))
    return out


def band_flux(mag, freqs, lo, hi):
    sel = (freqs >= lo) & (freqs < hi)
    lm = np.log1p(100 * mag[:, sel])
    d = np.diff(lm, axis=0, prepend=lm[:1])
    return np.maximum(d, 0).sum(axis=1)


def detrend(env, fps, secs=0.4):
    w = max(1, int(secs * fps))
    k = np.ones(2 * w + 1) / (2 * w + 1)
    return np.maximum(env - np.convolve(env, k, mode="same"), 0)


def comb_score(env, fps, bpm, phases):
    period = 60 * fps / bpm
    n = int((len(env) - 2) / period)
    k = np.arange(n) * period
    pos = phases[:, None] + k[None, :]
    i = np.floor(pos).astype(int)
    f = pos - i
    vals = env[i] * (1 - f) + env[i + 1] * f
    return vals.mean(axis=1)


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else "audio/savana-186.mp3"
    x = decode(path)
    dur = len(x) / SR
    mag = stft_mag(x)
    freqs = np.fft.rfftfreq(NFFT, 1 / SR)
    fps = SR / HOP
    # el centro de cada ventana va NFFT/2 muestras por detrás de su inicio
    frame_t = (np.arange(mag.shape[0]) * HOP + NFFT / 2) / SR

    onset = detrend(band_flux(mag, freqs, 30, 16000), fps)
    low = detrend(band_flux(mag, freqs, 30, 150), fps)
    high = detrend(band_flux(mag, freqs, 6000, 16000), fps)

    # 1) tempo fino alrededor de 120 y fase del pulso
    phases = np.arange(0, 60 * fps / 120, 0.25)
    best = None
    for bpm in np.arange(119.5, 120.5, 0.005):
        s = comb_score(onset, fps, bpm, phases)
        j = int(np.argmax(s))
        if best is None or s[j] > best[0]:
            best = (s[j], bpm, phases[j])
    _, bpm, phase_frames = best
    beat = 60 / bpm
    phase = phase_frames / fps + (NFFT / 2) / SR
    # los charles a contratiempo pueden ganar al bombo en la banda completa: decide la banda grave
    ls = comb_score(low, fps, bpm, phases)
    low_phase = phases[int(np.argmax(ls))] / fps + (NFFT / 2) / SR
    if abs(((phase - low_phase) / beat + 0.5) % 1 - 0.5) > 0.25:
        phase += beat / 2
    phase %= beat

    # estabilidad: fase local en tramos de 32 pulsos
    drift = []
    seg = int(32 * beat * fps)
    for a in range(0, len(onset) - seg, seg):
        s = comb_score(onset[a : a + seg + 2], fps, bpm, phases)
        local = (a + phases[int(np.argmax(s))]) / fps + (NFFT / 2) / SR
        d = ((local - phase) / beat + 0.5) % 1 - 0.5
        drift.append(round(d * beat * 1000, 1))

    beats = phase + beat * np.arange(int((dur - phase) / beat))

    # 2) rasgos por pulso
    chroma_bins = np.zeros((12, mag.shape[1]))
    for k, fr in enumerate(freqs):
        if 55 <= fr <= 2000:
            midi = 69 + 12 * np.log2(fr / 440)
            chroma_bins[int(round(midi)) % 12, k] = 1
    chroma = np.einsum("ij,kj->ik", mag.astype(np.float64) ** 2, chroma_bins)
    rms_frames = np.sqrt((mag.astype(np.float64) ** 2).mean(axis=1))

    def frame_of(t):
        return np.clip(np.searchsorted(frame_t, t), 0, len(frame_t) - 1)

    beat_feat = []
    for t in beats:
        a, b = frame_of(t), frame_of(t + beat)
        pk = frame_of(t - 0.03), frame_of(t + 0.05)
        c = chroma[a:b].mean(axis=0)
        beat_feat.append(
            dict(
                chroma=c / (np.linalg.norm(c) + 1e-9),
                rms=rms_frames[a:b].mean(),
                low=low[pk[0] : pk[1]].max(),
                high=high[pk[0] : pk[1]].max(),
            )
        )

    # 3) primer pulso del compás: donde más cambia la armonía y más golpean los platos
    def novelty(i):
        if i < 2:
            return 0
        prev = (beat_feat[i - 2]["chroma"] + beat_feat[i - 1]["chroma"]) / 2
        return 1 - float(prev @ beat_feat[i]["chroma"]) / (np.linalg.norm(prev) + 1e-9)

    nov = np.array([novelty(i) for i in range(len(beats))])
    hi = np.array([f["high"] for f in beat_feat])
    db_scores = []
    for o in range(4):
        sel = np.arange(o, len(beats), 4)
        db_scores.append(nov[sel].mean() / nov.mean() + hi[sel].mean() / hi.mean())
    rms_beat = np.array([f["rms"] for f in beat_feat])
    jumps = np.abs(np.log(rms_beat[1:] + 1e-9) - np.log(rms_beat[:-1] + 1e-9))
    top = np.argsort(jumps)[::-1][:12] + 1
    votes = np.bincount(top % 4, minlength=4)
    # los saltos pueden empezar medio pulso antes (platos, subidas): cuenta también el pulso siguiente
    votes2 = votes + 0.5 * np.bincount((top + 1) % 4, minlength=4)
    db = int(np.argmax(votes2))

    # 4) rasgos por compás
    bars = []
    for bi, i in enumerate(range(db, len(beats) - 4, 4)):
        fs = beat_feat[i : i + 4]
        c = np.mean([f["chroma"] for f in fs], axis=0)
        bars.append(
            dict(
                i=bi,
                t=float(beats[i]),
                rms=float(np.mean([f["rms"] for f in fs])),
                low=float(np.mean([f["low"] for f in fs])),
                high=float(np.mean([f["high"] for f in fs])),
                chroma=c / (np.linalg.norm(c) + 1e-9),
                crash=float(hi[i] / hi.mean()),
            )
        )
    rms_all = np.array([b["rms"] for b in bars])
    low_all = np.array([b["low"] for b in bars])
    high_all = np.array([b["high"] for b in bars])

    def vec(b):
        return np.array([b["rms"] / rms_all.max(), b["low"] / low_all.max(), b["high"] / high_all.max()])

    for k, b in enumerate(bars):
        if k == 0:
            b["nov"] = 1.0
            continue
        p = bars[k - 1]
        b["nov"] = float(np.linalg.norm(vec(b) - vec(p)) + (1 - p["chroma"] @ b["chroma"]))

    # 5) tramo de 7 compases: arranque de sección, interior estable, groove completo
    cands = []
    for s in range(1, len(bars) - BARS_IN_LOOP - 1):
        win = bars[s : s + BARS_IN_LOOP]
        inner = max(b["nov"] for b in win[1:])
        energy = np.mean([vec(b) @ np.array([0.6, 0.2, 0.2]) for b in win])
        # el compás 8 (lo que suena tras el empalme) debe parecerse al 1
        seam = float(np.linalg.norm(vec(bars[s + BARS_IN_LOOP]) - vec(bars[s])))
        score = energy + 0.6 * bars[s]["nov"] + 0.3 * min(bars[s]["crash"], 3) / 3 - 1.2 * inner - 0.8 * seam
        cands.append((score, s, energy, inner, seam))
    cands.sort(reverse=True)

    # 6) tonalidad (perfiles de Krumhansl) para afinar los sonidos de interfaz
    maj = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
    mnr = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
    prof = chroma.sum(axis=0)
    names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
    keys = []
    for r in range(12):
        keys.append((np.corrcoef(np.roll(maj, r), prof)[0, 1], names[r] + " major", r, "major"))
        keys.append((np.corrcoef(np.roll(mnr, r), prof)[0, 1], names[r] + " minor", r, "minor"))
    keys.sort(reverse=True)

    print(f"duración {dur:.2f}s  bpm {bpm:.3f}  fase {phase*1000:.1f} ms")
    # en banda completa, un tramo con charles fuertes puede dar ~±250 ms: es el contratiempo, no deriva
    print(f"deriva por tramos de 32 pulsos (ms; ~±250 = contratiempo, no deriva): {[float(d) for d in drift]}")
    print(f"primer pulso de compás = pulso {db} de cada 4  (votos por saltos de energía {votes.tolist()}, armonía {np.round(db_scores, 3).tolist()})")
    print(f"tonalidad: {keys[0][1]} ({keys[0][0]:.2f}), luego {keys[1][1]} ({keys[1][0]:.2f})")
    print("\ncompás  tiempo   rms   graves agudos  plato  novedad")
    for b in bars:
        mark = " <" if b["nov"] > 0.25 else ""
        print(
            f"{b['i']:5d} {b['t']:7.2f}s {vec(b)[0]:5.2f} {vec(b)[1]:6.2f} {vec(b)[2]:6.2f} "
            f"{b['crash']:6.2f} {b['nov']:7.3f}{mark}"
        )
    print("\nmejores tramos (puntuación, compás, energía, cambio interno, empalme):")
    for c in cands[:8]:
        print(f"  {c[0]:.3f}  compás {c[1]:3d} ({bars[c[1]]['t']:.2f}s)  energía {c[2]:.2f}  interno {c[3]:.3f}  empalme {c[4]:.3f}")

    chosen = cands[0][1]
    t0 = bars[chosen]["t"]
    hp = np.diff(x, prepend=x[0])  # paso alto sencillo: realza el clic del bombo
    ms = int(SR / 1000)
    acc = np.zeros(80)
    for k in range(BARS_IN_LOOP * 4):
        a = int((t0 + k * beat - 0.040) * SR)
        seg = np.abs(hp[a : a + 80 * ms]).reshape(80, ms).max(axis=1)
        acc += seg
    acc /= BARS_IN_LOOP * 4
    base, peak = np.median(acc[:20]), acc.max()
    attack_ms = int(np.argmax(acc > base + 0.5 * (peak - base))) - 40
    t0_exact = t0 + attack_ms / 1000
    print(f"ataque medio del golpe respecto a la rejilla: {attack_ms:+d} ms")
    out = dict(
        source=path,
        duration=dur,
        bpm=round(float(bpm), 4),
        beat=beat,
        phase=phase,
        downbeat_offset=db,
        key=dict(name=keys[0][1], root=keys[0][2], mode=keys[0][3]),
        loop=dict(start_bar=chosen, start=t0_exact, grid_start=t0, attack_ms=attack_ms, bars=BARS_IN_LOOP, length=BARS_IN_LOOP * 4 * beat),
        bars=[dict(i=b["i"], t=round(b["t"], 4), nov=round(b["nov"], 3)) for b in bars],
    )
    with open("audio/song.json", "w") as f:
        json.dump(out, f, indent=1)
    print(f"\nelegido: compás {chosen}, el tramo empieza en {t0_exact:.4f}s → audio/song.json")


if __name__ == "__main__":
    main()
