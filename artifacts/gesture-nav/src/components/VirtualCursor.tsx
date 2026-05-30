import { useEffect, useRef, useState } from "react";
import { useGestureContext } from "@/context/GestureContext";

export function VirtualCursor() {
  const { currentGesture, cursorPosition, hoveredNavItem } = useGestureContext();
  const isPointing = currentGesture === "POINT_FINGER";
  const progressRef = useRef<number>(0);
  const hoverStartRef = useRef<number | null>(null);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPointing && hoveredNavItem) {
      if (!hoverStartRef.current) hoverStartRef.current = Date.now();
      const tick = () => {
        if (!hoverStartRef.current) return;
        const elapsed = Date.now() - hoverStartRef.current;
        const p = Math.min(1, elapsed / 800);
        progressRef.current = p;
        setProgress(p);
        if (p < 1) rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } else {
      hoverStartRef.current = null;
      progressRef.current = 0;
      setProgress(0);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPointing, hoveredNavItem]);

  if (!isPointing || !cursorPosition) return null;

  const r = 14;
  const circumference = 2 * Math.PI * r;
  const strokeDash = circumference * progress;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50"
      data-testid="virtual-cursor"
    >
      <div
        className="absolute"
        style={{
          left: cursorPosition.x - 20,
          top: cursorPosition.y - 20,
          width: 40,
          height: 40,
          transition: "left 0.04s linear, top 0.04s linear",
        }}
      >
        <svg width={40} height={40} viewBox="0 0 40 40" style={{ overflow: "visible" }}>
          <circle
            cx={20}
            cy={20}
            r={r}
            fill="none"
            stroke="rgba(0,212,255,0.15)"
            strokeWidth={2}
          />
          {progress > 0 && (
            <circle
              cx={20}
              cy={20}
              r={r}
              fill="none"
              stroke="#00d4ff"
              strokeWidth={2}
              strokeDasharray={`${strokeDash} ${circumference}`}
              strokeLinecap="round"
              transform="rotate(-90 20 20)"
              style={{ filter: "drop-shadow(0 0 4px #00d4ff)" }}
            />
          )}
          <circle
            cx={20}
            cy={20}
            r={4}
            fill="#00d4ff"
            style={{ filter: "drop-shadow(0 0 6px #00d4ff) drop-shadow(0 0 12px #00d4ff)" }}
          />
        </svg>
      </div>

      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          left: cursorPosition.x - 3,
          top: cursorPosition.y - 3,
          width: 6,
          height: 6,
          background: "rgba(0,212,255,0.5)",
          filter: "blur(3px)",
          transition: "left 0.08s linear, top 0.08s linear",
        }}
      />
    </div>
  );
}
