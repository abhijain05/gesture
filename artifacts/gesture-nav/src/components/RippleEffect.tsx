import { useEffect, useRef, useState } from "react";
import { useGestureContext } from "@/context/GestureContext";

interface Ripple {
  id: number;
  x: number;
  y: number;
  color: string;
}

const GESTURE_COLORS: Record<string, string> = {
  PINCH: "#a855f7",
  OPEN_PALM: "#22c55e",
  POINT_FINGER: "#00d4ff",
};

export function RippleEffect() {
  const { currentGesture, cursorPosition } = useGestureContext();
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const lastGestureRef = useRef<string>("NONE");
  const rippleIdRef = useRef(0);

  useEffect(() => {
    const prev = lastGestureRef.current;
    lastGestureRef.current = currentGesture;

    if (
      currentGesture !== "NONE" &&
      currentGesture !== prev &&
      GESTURE_COLORS[currentGesture]
    ) {
      const color = GESTURE_COLORS[currentGesture];
      const x = cursorPosition?.x ?? window.innerWidth / 2;
      const y = cursorPosition?.y ?? window.innerHeight / 2;
      const id = ++rippleIdRef.current;

      setRipples((prev) => [...prev, { id, x, y, color }]);
      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 800);
    }
  }, [currentGesture, cursorPosition]);

  return (
    <div className="fixed inset-0 pointer-events-none z-30" data-testid="ripple-container">
      {ripples.map(({ id, x, y, color }) => (
        <div
          key={id}
          className="absolute rounded-full"
          style={{
            left: x - 40,
            top: y - 40,
            width: 80,
            height: 80,
            border: `2px solid ${color}`,
            background: `radial-gradient(circle, ${color}22 0%, transparent 70%)`,
            animation: "ripple-expand 0.8s ease-out forwards",
          }}
        />
      ))}

      <style>{`
        @keyframes ripple-expand {
          0% { transform: scale(0.3); opacity: 1; }
          100% { transform: scale(3); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
