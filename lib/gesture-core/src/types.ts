export type GestureType = "POINT_FINGER" | "PINCH" | "OPEN_PALM" | "TWO_FINGER" | "FIST" | "NONE";

export interface GestureSettings {
  pointFingerEnabled: boolean;
  pinchEnabled: boolean;
  openPalmEnabled: boolean;
  twoFingerEnabled: boolean;
  sensitivity: number;
  dwellTimeMs: number;
  palmHoldMs: number;
  audioFeedback: boolean;
  showCursor: boolean;
  showWebcam: boolean;
}

export interface GestureEngineOptions {
  container?: HTMLElement;
  sensitivity?: number;
  dwellTimeMs?: number;
  palmHoldMs?: number;
  audioFeedback?: boolean;
  showCursor?: boolean;
  showWebcam?: boolean;
  virtualKeyboard?: boolean;
}

export interface GestureState {
  currentGesture: GestureType;
  confidence: number;
  cursorPosition: { x: number; y: number } | null;
  fps: number;
  isTracking: boolean;
}

export type GestureEventMap = {
  ready: CustomEvent<{ message: string }>;
  error: CustomEvent<{ message: string }>;
  change: CustomEvent<{ gesture: GestureType; confidence: number; previous: GestureType }>;
  cursor: CustomEvent<{ x: number; y: number }>;
  pinch: CustomEvent<{ x: number; y: number }>;
  palm: CustomEvent<Record<string, never>>;
  palmProgress: CustomEvent<{ progress: number; secondsLeft: number }>;
  pause: CustomEvent<{ duration: number }>;
  resume: CustomEvent<Record<string, never>>;
  twofinger: CustomEvent<{ deltaY: number; deltaX: number }>;
  dwell: CustomEvent<{ x: number; y: number; target: Element | null; progress: number }>;
};

export type GestureEventType = keyof GestureEventMap;
