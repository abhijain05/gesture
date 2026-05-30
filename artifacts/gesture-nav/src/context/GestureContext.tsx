import { createContext, useContext, useState, ReactNode } from "react";
import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

export type GestureType = "POINT_FINGER" | "PINCH" | "OPEN_PALM" | "TWO_FINGER" | "NONE";

export interface GestureSettings {
  pointFingerEnabled: boolean;
  pinchEnabled: boolean;
  openPalmEnabled: boolean;
  twoFingerEnabled: boolean;
  sensitivity: number;
}

export interface GestureState {
  currentGesture: GestureType;
  confidence: number;
  landmarks: NormalizedLandmark[] | null;
  cursorPosition: { x: number; y: number } | null;
  fps: number;
  isTracking: boolean;
  hoveredNavItem: string | null;
  gestureSettings: GestureSettings;
  setGestureState: (state: Partial<Omit<GestureState, "setGestureState">>) => void;
  updateSettings: (settings: Partial<GestureSettings>) => void;
}

const defaultSettings: GestureSettings = {
  pointFingerEnabled: true,
  pinchEnabled: true,
  openPalmEnabled: true,
  twoFingerEnabled: true,
  sensitivity: 0.6,
};

const GestureContext = createContext<GestureState | null>(null);

export function GestureProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<GestureState, "setGestureState" | "updateSettings">>({
    currentGesture: "NONE",
    confidence: 0,
    landmarks: null,
    cursorPosition: null,
    fps: 0,
    isTracking: false,
    hoveredNavItem: null,
    gestureSettings: defaultSettings,
  });

  const setGestureState = (newState: Partial<Omit<GestureState, "setGestureState" | "updateSettings">>) => {
    setState((prev) => ({ ...prev, ...newState }));
  };

  const updateSettings = (settings: Partial<GestureSettings>) => {
    setState((prev) => ({
      ...prev,
      gestureSettings: { ...prev.gestureSettings, ...settings },
    }));
  };

  return (
    <GestureContext.Provider value={{ ...state, setGestureState, updateSettings }}>
      {children}
    </GestureContext.Provider>
  );
}

export function useGestureContext() {
  const context = useContext(GestureContext);
  if (!context) {
    throw new Error("useGestureContext must be used within a GestureProvider");
  }
  return context;
}
