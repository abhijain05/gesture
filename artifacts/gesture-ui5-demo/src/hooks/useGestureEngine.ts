import { useEffect, useState, useRef } from "react";
import { GestureEngine } from "@workspace/gesture-core";
import type { GestureState } from "@workspace/gesture-core";

export type EngineStatus = "idle" | "loading" | "ready" | "error";

const DEFAULT_STATE: GestureState = {
  currentGesture: "NONE",
  confidence: 0,
  cursorPosition: null,
  fps: 0,
  isTracking: false,
};

export function useGestureEngine(enabled = true) {
  const engineRef = useRef<GestureEngine | null>(null);
  const [gestureState, setGestureState] = useState<GestureState>(DEFAULT_STATE);
  const [status, setStatus] = useState<EngineStatus>("idle");

  useEffect(() => {
    if (!enabled) return;

    const engine = new GestureEngine({
      sensitivity: 0.65,
      showCursor: true,
      showWebcam: true,
      dwellTimeMs: 700,
      audioFeedback: true,
    });
    engineRef.current = engine;

    engine.on("ready", () => {
      setStatus("ready");
      setGestureState((s) => ({ ...s, isTracking: true }));
    });

    engine.on("error", () => setStatus("error"));

    engine.on("change", (e) => {
      setGestureState((s) => ({
        ...s,
        currentGesture: e.detail.gesture,
        confidence: e.detail.confidence,
      }));
    });

    engine.on("cursor", (e) => {
      setGestureState((s) => ({ ...s, cursorPosition: e.detail }));
    });

    setStatus("loading");
    engine.start().catch(() => setStatus("error"));

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [enabled]);

  return { gestureState, status, engine: engineRef.current };
}
