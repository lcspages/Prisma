/**
 * Sons ambientes gerados no próprio navegador (Web Audio API).
 * Não depende de arquivos de áudio nem de serviços externos.
 *
 *   white  ruído branco
 *   brown  ruído marrom (grave, abafa conversas)
 *   rain   chuva: ruído rosa filtrado com variação lenta de intensidade
 *   lofi   acordes suaves em loop com chiado de vinil
 */
export type AmbientKind = "white" | "brown" | "rain" | "lofi";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let stopCurrent: (() => void) | null = null;
let currentKind: AmbientKind | null = null;

function audio(): { ctx: AudioContext; master: GainNode } | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return { ctx, master: master! };
}

function noiseBuffer(c: AudioContext, kind: "white" | "pink" | "brown"): AudioBuffer {
  const length = c.sampleRate * 4;
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const out = buffer.getChannelData(0);
  let last = 0;
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    if (kind === "white") out[i] = white * 0.35;
    else if (kind === "brown") {
      last = (last + 0.02 * white) / 1.02;
      out[i] = last * 3.2;
    } else {
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.969 * b2 + white * 0.153852;
      b3 = 0.8665 * b3 + white * 0.3104856;
      b4 = 0.55 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.016898;
      out[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }
  return buffer;
}

function loopNoise(c: AudioContext, kind: "white" | "pink" | "brown"): AudioBufferSourceNode {
  const src = c.createBufferSource();
  src.buffer = noiseBuffer(c, kind);
  src.loop = true;
  return src;
}

function startNoise(c: AudioContext, out: AudioNode, kind: "white" | "brown"): () => void {
  const src = loopNoise(c, kind);
  const gain = c.createGain();
  gain.gain.value = kind === "white" ? 0.5 : 0.9;
  src.connect(gain).connect(out);
  src.start();
  return () => src.stop();
}

function startRain(c: AudioContext, out: AudioNode): () => void {
  const src = loopNoise(c, "pink");
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 500;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 6500;
  const gain = c.createGain();
  gain.gain.value = 0.9;
  // Variação lenta de intensidade, como chuva que engrossa e afina.
  const lfo = c.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 0.25;
  lfo.connect(lfoGain).connect(gain.gain);
  src.connect(hp).connect(lp).connect(gain).connect(out);
  src.start();
  lfo.start();
  return () => {
    src.stop();
    lfo.stop();
  };
}

const CHORDS = [
  [174.61, 220.0, 261.63, 329.63], // Fmaj7
  [164.81, 196.0, 246.94, 293.66], // Em7
  [146.83, 174.61, 220.0, 261.63], // Dm7
  [130.81, 164.81, 196.0, 246.94], // Cmaj7
];

function startLofi(c: AudioContext, out: AudioNode): () => void {
  const bus = c.createGain();
  bus.gain.value = 0.8;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 1100;
  bus.connect(lp).connect(out);

  // Chiado de vinil
  const hiss = loopNoise(c, "white");
  const hissFilter = c.createBiquadFilter();
  hissFilter.type = "highpass";
  hissFilter.frequency.value = 3000;
  const hissGain = c.createGain();
  hissGain.gain.value = 0.05;
  hiss.connect(hissFilter).connect(hissGain).connect(out);
  hiss.start();

  const chordLength = 3.2;
  let index = 0;
  let nextTime = c.currentTime + 0.05;
  const oscillators = new Set<OscillatorNode>();

  const schedule = () => {
    while (nextTime < c.currentTime + 1.5) {
      const chord = CHORDS[index % CHORDS.length];
      chord.forEach((freq, i) => {
        const osc = c.createOscillator();
        osc.type = i === 0 ? "sine" : "triangle";
        osc.frequency.value = i === 0 ? freq / 2 : freq;
        osc.detune.value = (Math.random() - 0.5) * 8;
        const env = c.createGain();
        const peak = i === 0 ? 0.16 : 0.07;
        env.gain.setValueAtTime(0, nextTime);
        env.gain.linearRampToValueAtTime(peak, nextTime + 0.35);
        env.gain.setTargetAtTime(peak * 0.5, nextTime + 0.6, 0.8);
        env.gain.linearRampToValueAtTime(0, nextTime + chordLength + 0.4);
        osc.connect(env).connect(bus);
        osc.start(nextTime);
        osc.stop(nextTime + chordLength + 0.5);
        oscillators.add(osc);
        osc.onended = () => oscillators.delete(osc);
      });
      index++;
      nextTime += chordLength;
    }
  };
  schedule();
  const timer = window.setInterval(schedule, 500);

  return () => {
    window.clearInterval(timer);
    hiss.stop();
    oscillators.forEach((o) => {
      try {
        o.stop();
      } catch {
        /* já parou */
      }
    });
  };
}

export function playAmbient(kind: AmbientKind, volume: number) {
  const a = audio();
  if (!a) return;
  setAmbientVolume(volume);
  if (currentKind === kind && stopCurrent) return;
  stopAmbient();
  const { ctx: c, master: out } = a;
  stopCurrent =
    kind === "rain" ? startRain(c, out) : kind === "lofi" ? startLofi(c, out) : startNoise(c, out, kind);
  currentKind = kind;
}

export function stopAmbient() {
  stopCurrent?.();
  stopCurrent = null;
  currentKind = null;
}

export function setAmbientVolume(volume: number) {
  if (!master || !ctx) return;
  master.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)) * 0.8, ctx.currentTime, 0.05);
}

/** Sinal curto de fim de sessão. */
export function playChime() {
  const a = audio();
  if (!a) return;
  const { ctx: c } = a;
  [659.25, 880].forEach((freq, i) => {
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const env = c.createGain();
    const t = c.currentTime + i * 0.18;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.25, t + 0.02);
    env.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    osc.connect(env).connect(c.destination);
    osc.start(t);
    osc.stop(t + 1);
  });
}
