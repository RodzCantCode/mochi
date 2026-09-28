"""Mezcla de audio del bucle: tramo de la canción + sonidos de interfaz sintetizados.

Uso: .venv/bin/python mix.py
Lee los tiempos de index.html (bloque #timeline) y el tramo elegido de audio/song.json.
Escribe audio/mix.wav (14 s exactos, estéreo, 44,1 kHz).

Cada sonido se coloca de forma que su pico medido caiga en el instante del evento.
Todo se suma de forma periódica: lo que sobresale por un extremo entra por el otro,
así el bucle empalma también en el audio.
"""
import json
import re
import subprocess
import wave

import numpy as np

SR = 44100
rng = np.random.default_rng(7)


def t_(n):
    return np.arange(n) / SR


def env(n, attack, decay):
    """Envolvente: subida lineal de `attack` s y caída exponencial de constante `decay` s."""
    t = t_(n)
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return a * np.exp(-np.maximum(t - attack, 0) / decay)


def band(x, lo, hi):
    """Filtro paso banda suave en frecuencia (para ruido corto)."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.exp(-0.5 * (np.log(np.maximum(f, 1) / np.sqrt(lo * hi)) / (np.log(hi / lo) / 2.2)) ** 2)
    return np.fft.irfft(X * m, len(x))


def norm(x, peak=1.0):
    return x / (np.abs(x).max() + 1e-12) * peak


def s_click(bright=1.0):
    n = int(0.05 * SR)
    t = t_(n)
    noise = band(rng.standard_normal(n), 2500 * bright, 7000 * bright) * env(n, 0.0004, 0.004)
    body = np.sin(2 * np.pi * (1150 * bright) * t * (1 - 0.25 * t / 0.05)) * env(n, 0.0006, 0.009)
    return norm(0.8 * norm(noise) + 0.55 * body)


def s_release():
    return norm(s_click(1.35)) * 0.55


def s_tick():
    n = int(0.03 * SR)
    t = t_(n)
    x = np.sin(2 * np.pi * 2400 * t) * env(n, 0.0005, 0.006) + 0.25 * band(rng.standard_normal(n), 3000, 9000) * env(n, 0.0003, 0.002)
    return norm(x) * 0.6


def s_drag():
    n = int(0.02 * SR)
    t = t_(n)
    x = np.sin(2 * np.pi * 3300 * t) * env(n, 0.0003, 0.0025)
    return norm(x) * 0.28


def s_grab():
    n = int(0.06 * SR)
    t = t_(n)
    x = np.sin(2 * np.pi * 620 * t) * env(n, 0.001, 0.014) + 0.5 * band(rng.standard_normal(n), 1200, 4000) * env(n, 0.0005, 0.004)
    return norm(x) * 0.6


def s_limit():
    n = int(0.08 * SR)
    t = t_(n)
    x = np.sin(2 * np.pi * 1760 * t) * env(n, 0.0005, 0.008) + 0.7 * np.sin(2 * np.pi * 349.2 * t) * env(n, 0.002, 0.03)
    return norm(x) * 0.7


def s_pop():
    n = int(0.12 * SR)
    t = t_(n)
    f = 440 + (880 - 440) * (1 - np.exp(-t / 0.012))  # sube hasta La5 (dentro de fa mayor)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return norm(np.sin(ph) * env(n, 0.003, 0.03)) * 0.75


def s_swish():
    n = int(0.22 * SR)
    t = t_(n)
    x = band(rng.standard_normal(n), 1400, 6500)
    e = np.sin(np.pi * np.clip(t / 0.2, 0, 1)) ** 2.2 * np.exp(-t / 0.3)
    return norm(x * e) * 0.35


def s_key(k=0):
    n = int(0.06 * SR)
    t = t_(n)
    r = np.random.default_rng(100 + k)
    tone = 250 * (1 + 0.06 * r.standard_normal())
    x = (
        0.9 * norm(band(r.standard_normal(n), 1800, 8000)) * env(n, 0.0003, 0.0035)
        + 0.6 * np.sin(2 * np.pi * tone * t) * env(n, 0.0008, 0.012)
        + 0.25 * np.sin(2 * np.pi * 4100 * t) * env(n, 0.0002, 0.0015)
    )
    return norm(x) * (0.55 + 0.08 * r.random())


def s_enter():
    n = int(0.08 * SR)
    t = t_(n)
    x = 0.8 * norm(band(rng.standard_normal(n), 1200, 6000)) * env(n, 0.0004, 0.005) + 0.8 * np.sin(2 * np.pi * 175 * t) * env(n, 0.001, 0.02)
    return norm(x) * 0.7


def s_toggle():
    a, b = s_click(0.9), s_click(1.2) * 0.7
    gap = int(0.028 * SR)
    x = np.zeros(len(a) + gap)
    x[: len(a)] += a
    x[gap : gap + len(b)] += b
    return norm(x) * 0.8


def s_chime():
    # quinta ascendente en fa mayor: Fa5 → Do6
    n = int(0.7 * SR)
    t = t_(n)
    x = np.zeros(n)
    for f0, start, g in [(698.46, 0.0, 0.8), (1046.5, 0.075, 1.0)]:
        s0 = int(start * SR)
        tt = t[: n - s0]
        e = env(n - s0, 0.004, 0.22)
        x[s0:] += g * e * (np.sin(2 * np.pi * f0 * tt) + 0.18 * np.sin(2 * np.pi * 2 * f0 * tt))
    return norm(x) * 0.5


SOUNDS = {
    "click": s_click, "release": s_release, "tick": s_tick, "drag": s_drag, "grab": s_grab,
    "limit": s_limit, "pop": s_pop, "swish": s_swish, "key": s_key, "enter": s_enter,
    "toggle": s_toggle, "chime": s_chime,
}


def peak_index(x):
    """Pico medido: máximo de la envolvente (media móvil de 1 ms del valor absoluto)."""
    w = int(0.001 * SR)
    e = np.convolve(np.abs(x), np.ones(w) / w, mode="same")
    return int(np.argmax(e))


def decode(path, start, dur):
    # se decodifica entera y se corta por muestras, igual que en analyze.py,
    # para que el tramo empiece exactamente donde se midió
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"],
        check=True, capture_output=True,
    ).stdout
    x = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)
    a = int(round(start * SR))
    return x[a : a + int(round(dur * SR))].astype(np.float64)


def main():
    html = open("index.html", encoding="utf-8").read()
    tl = json.loads(re.search(r'<script type="application/json" id="timeline">(.*?)</script>', html, re.S).group(1))
    song = json.load(open("audio/song.json"))
    beat = 60 / tl["bpm"]
    T = tl["bars"] * 4 * beat
    N = int(round(T * SR))
    ev = {k: ((b - 1) * 4 + (p - 1) + s) * beat for k, (b, p, s) in tl["events"].items()}

    # música: el tramo exacto y una cola de fundido al final que entra en lo que suena
    # justo antes del tramo, para que la vuelta al principio sea continua
    X = int(0.10 * SR)
    S = song["loop"]["start"]
    pre = decode(song["source"], S - X / SR, X / SR + T + 0.01)
    body = pre[X : X + N]
    lead_in = pre[:X]
    music = body.copy()
    u = np.linspace(0, 1, X)[:, None]
    fin, fout = np.sin(u * np.pi / 2), np.cos(u * np.pi / 2)
    music[N - X :] = body[N - X :] * fout + lead_in * fin
    music *= 10 ** (-4.5 / 20)

    # sonidos de interfaz, cada uno con su pico en el instante del evento
    ui = np.zeros(N)
    report = []
    key_n = 0
    for cue in tl["cues"]:
        kind, name = cue[0], cue[1]
        off = cue[2] if len(cue) > 2 else 0
        gain_db = cue[3] if len(cue) > 3 else 0
        if kind == "key":
            x = s_key(key_n)
            key_n += 1
        else:
            x = SOUNDS[kind]()
        pk = peak_index(x)
        at = ev[name] + off * beat
        start = int(round(at * SR)) - pk
        idx = (start + np.arange(len(x))) % N  # suma periódica
        np.add.at(ui, idx, x * 10 ** (gain_db / 20))
        report.append((at, kind, name, pk / SR * 1000))
    ui *= 0.32

    mix = music + ui[:, None]
    # limitador suave por encima de -2 dBFS
    lim = 10 ** (-2 / 20)
    a = np.abs(mix)
    over = a > lim
    mix[over] = np.sign(mix[over]) * (lim + (1 - lim) * np.tanh((a[over] - lim) / (1 - lim)))
    mix = np.clip(mix, -0.999, 0.999)

    pcm = (mix * 32767).astype(np.int16)
    with wave.open("audio/mix.wav", "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())

    print(f"audio/mix.wav: {N} muestras ({N / SR:.3f} s), pico {np.abs(mix).max():.3f}, "
          f"tramo desde {S:.4f}s, {len(report)} sonidos")
    for at, kind, name, pk in sorted(report):
        grid = at / (beat / 4)
        mark = "" if abs(grid - round(grid)) < 1e-6 else "  (fuera de la rejilla de semicorcheas)"
        print(f"  {at:6.3f}s  {kind:8s} {name:13s} pico a {pk:5.1f} ms del inicio{mark}")
    # continuidad del empalme: salto de muestra entre el final y el principio
    jump = np.abs(mix[0] - mix[-1]).max()
    typical = np.median(np.abs(np.diff(mix[:, 0])))
    print(f"empalme: salto {jump:.4f} (paso típico entre muestras {typical:.4f})")


if __name__ == "__main__":
    main()
