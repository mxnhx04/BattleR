// Procedurally-generated sound effects via the Web Audio API — no audio
// asset files, no network requests. Every call site triggers playback from
// a user-initiated click, so browser autoplay restrictions don't apply.

export type SfxKind = "join" | "attack" | "power" | "shield" | "heal" | "eliminate" | "win";

let ctx: AudioContext | undefined;

function getContext(): AudioContext | undefined {
  if (typeof window === "undefined") return undefined;
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return undefined;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

interface Tone {
  freq: number;
  start: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  sweepTo?: number;
}

function playTones(tones: Tone[]) {
  const audioCtx = getContext();
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  for (const tone of tones) {
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = tone.type ?? "sine";
    osc.frequency.setValueAtTime(tone.freq, now + tone.start);
    if (tone.sweepTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        tone.sweepTo,
        now + tone.start + tone.duration,
      );
    }

    const peak = tone.gain ?? 0.15;
    gainNode.gain.setValueAtTime(0, now + tone.start);
    gainNode.gain.linearRampToValueAtTime(peak, now + tone.start + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + tone.start + tone.duration);

    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start(now + tone.start);
    osc.stop(now + tone.start + tone.duration + 0.02);
  }
}

const RECIPES: Record<SfxKind, () => Tone[]> = {
  join: () => [{ freq: 660, start: 0, duration: 0.1, type: "sine", gain: 0.12 }],
  attack: () => [
    { freq: 320, start: 0, duration: 0.09, type: "square", gain: 0.14, sweepTo: 120 },
  ],
  power: () => [
    { freq: 220, start: 0, duration: 0.18, type: "sawtooth", gain: 0.16, sweepTo: 70 },
    { freq: 110, start: 0, duration: 0.18, type: "square", gain: 0.08, sweepTo: 55 },
  ],
  shield: () => [
    { freq: 440, start: 0, duration: 0.12, type: "sine", gain: 0.12, sweepTo: 880 },
  ],
  heal: () => [
    { freq: 523, start: 0, duration: 0.09, type: "sine", gain: 0.12 },
    { freq: 784, start: 0.09, duration: 0.12, type: "sine", gain: 0.12 },
  ],
  eliminate: () => [
    { freq: 300, start: 0, duration: 0.35, type: "sawtooth", gain: 0.14, sweepTo: 60 },
  ],
  win: () => [
    { freq: 523, start: 0, duration: 0.12, type: "triangle", gain: 0.14 },
    { freq: 659, start: 0.12, duration: 0.12, type: "triangle", gain: 0.14 },
    { freq: 784, start: 0.24, duration: 0.12, type: "triangle", gain: 0.14 },
    { freq: 1047, start: 0.36, duration: 0.28, type: "triangle", gain: 0.16 },
  ],
};

export function playSfx(kind: SfxKind) {
  playTones(RECIPES[kind]());
}
