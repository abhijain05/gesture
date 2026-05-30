export type SoundType = "hover" | "select" | "home" | "dwell";

const SOUNDS: Record<SoundType, { freq: number; gain: number; duration: number }> = {
  hover:  { freq: 440,  gain: 0.08,  duration: 0.08 },
  select: { freq: 880,  gain: 0.12,  duration: 0.12 },
  home:   { freq: 660,  gain: 0.10,  duration: 0.15 },
  dwell:  { freq: 550,  gain: 0.06,  duration: 0.06 },
};

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!audioCtx || audioCtx.state === "closed") {
      audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function playSound(type: SoundType): void {
  const ctx = getCtx();
  if (!ctx) return;
  try {
    const { freq, gain, duration } = SOUNDS[type];
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.frequency.value = freq;
    gainNode.gain.value = gain;
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // ignore
  }
}
