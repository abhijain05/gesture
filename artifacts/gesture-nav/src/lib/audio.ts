export function playGestureSound(type: "hover" | "select" | "home") {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (type === "hover") { 
      osc.frequency.value = 440; 
      gain.gain.value = 0.1; 
    }
    if (type === "select") { 
      osc.frequency.value = 880; 
      gain.gain.value = 0.15; 
    }
    if (type === "home") { 
      osc.frequency.value = 660; 
      gain.gain.value = 0.12; 
    }
    
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    // Ignore audio context errors if they happen before user interaction
    console.warn("Audio feedback failed to play", e);
  }
}
