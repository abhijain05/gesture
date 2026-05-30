import { useEffect, useState } from "react";

const STEPS = [
  "Initializing hand tracking...",
  "Loading MediaPipe model...",
  "Calibrating gesture engine...",
  "Ready",
];

interface LoadingScreenProps {
  onComplete?: () => void;
}

export function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const durations = [800, 1000, 700, 400];
    let totalMs = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    durations.forEach((dur, i) => {
      totalMs += dur;
      timers.push(
        setTimeout(() => {
          setStep(i + 1);
          setProgress(((i + 1) / STEPS.length) * 100);
          if (i === durations.length - 1) {
            setTimeout(() => onComplete?.(), 300);
          }
        }, totalMs)
      );
    });

    const progressTimer = setInterval(() => {
      setProgress((p) => Math.min(p + 0.5, 98));
    }, 40);

    timers.push(progressTimer as any);
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{
        background: "radial-gradient(ellipse at center, #0d1829 0%, #050812 60%)",
      }}
      data-testid="loading-screen"
    >
      <div
        className="absolute inset-0 overflow-hidden pointer-events-none"
        aria-hidden="true"
      >
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-10 blob"
            style={{
              width: 600 + i * 200,
              height: 600 + i * 200,
              left: `${20 + i * 15}%`,
              top: `${10 + i * 10}%`,
              background:
                i === 0
                  ? "radial-gradient(circle, #00d4ff 0%, transparent 70%)"
                  : i === 1
                  ? "radial-gradient(circle, #7c3aed 0%, transparent 70%)"
                  : "radial-gradient(circle, #0ea5e9 0%, transparent 70%)",
              animationDelay: `${i * 3}s`,
              animationDuration: `${18 + i * 5}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col items-center gap-8 px-8">
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-2"
            style={{
              background: "linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)",
              boxShadow: "0 0 40px rgba(0,212,255,0.3), 0 0 80px rgba(124,58,237,0.2)",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M16 3L22 11H19V20H13V11H10L16 3Z" fill="white" />
              <circle cx="16" cy="25" r="4" fill="white" fillOpacity="0.8" />
            </svg>
          </div>

          <h1
            className="font-bold tracking-widest text-white"
            style={{ fontSize: "2rem", letterSpacing: "0.2em" }}
          >
            GESTURE
          </h1>
          <h2
            className="font-bold tracking-widest"
            style={{ fontSize: "2rem", letterSpacing: "0.2em", color: "#00d4ff" }}
          >
            NAVIGATOR
          </h2>
          <p className="text-muted-foreground text-sm tracking-wider mt-1">
            Hand-controlled interface
          </p>
        </div>

        <div className="w-64 flex flex-col gap-2">
          <div
            className="h-0.5 w-full rounded-full overflow-hidden"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #00d4ff, #7c3aed)",
                boxShadow: "0 0 8px #00d4ff",
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span
              className="font-mono text-xs text-muted-foreground"
              style={{ fontSize: "11px" }}
            >
              {STEPS[Math.min(step, STEPS.length - 1)]}
            </span>
            <span
              className="font-mono text-xs"
              style={{ fontSize: "11px", color: "#00d4ff" }}
            >
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6 mt-2">
          {["Point", "Pinch", "Palm"].map((gesture, i) => (
            <div
              key={gesture}
              className="flex flex-col items-center gap-1 opacity-40"
              style={{
                animation: `fade-in 0.5s ease ${i * 0.2 + 0.5}s forwards`,
                opacity: 0,
              }}
            >
              <div
                className="w-8 h-8 rounded-lg border flex items-center justify-center text-xs"
                style={{
                  borderColor: "rgba(255,255,255,0.1)",
                  background: "rgba(255,255,255,0.03)",
                  color: "#6b7280",
                }}
              >
                {i === 0 ? "☛" : i === 1 ? "✦" : "✋"}
              </div>
              <span className="text-xs text-muted-foreground" style={{ fontSize: "10px" }}>
                {gesture}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
