import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { HandTracker } from "./HandTracker.js";
import { detectGesture } from "./GestureRecognizer.js";
import { CursorOverlay } from "./CursorOverlay.js";
import { VirtualKeyboard } from "./VirtualKeyboard.js";
import { GestureGuide } from "./GestureGuide.js";
import { ActionToast } from "./ActionToast.js";
import { playSound } from "./AudioFeedback.js";
import type {
  GestureEngineOptions,
  GestureSettings,
  GestureState,
  GestureType,
  GestureEventType,
  GestureEventMap,
} from "./types.js";

const DEFAULT_SETTINGS: GestureSettings = {
  pointFingerEnabled: true,
  pinchEnabled: true,
  openPalmEnabled: true,
  twoFingerEnabled: true,
  sensitivity: 0.6,
  dwellTimeMs: 600,
  palmHoldMs: 3000,
  audioFeedback: true,
  showCursor: true,
  showWebcam: true,
};

const PINCH_DEBOUNCE_MS = 800;

export class GestureEngine {
  private settings: GestureSettings;
  private tracker: HandTracker | null = null;
  private overlay: CursorOverlay | null = null;
  private keyboard: VirtualKeyboard | null = null;
  private guide: GestureGuide | null = null;
  private toast: ActionToast | null = null;
  private video: HTMLVideoElement;
  private webcamCanvas: HTMLCanvasElement | null = null;
  private useVirtualKeyboard: boolean;

  private gestureBuffer: GestureType[] = [];
  private smoothCursor: { x: number; y: number } | null = null;
  private prevTwoFingerY: number | null = null;
  private prevTwoFingerX: number | null = null;
  private dwellStart: number | null = null;
  private lastDwellTarget: Element | null = null;
  private lastPinchTime = 0;
  private palmHoldStart: number | null = null;
  private palmFireCooldownUntil = 0;
  private fistHoldStart: number | null = null;
  private pausedUntil = 0;
  private previousGesture: GestureType = "NONE";

  private state: GestureState = {
    currentGesture: "NONE",
    confidence: 0,
    cursorPosition: null,
    fps: 0,
    isTracking: false,
  };

  private emitter = new EventTarget();
  private listeners = new Map<string, Set<EventListener>>();

  constructor(options: GestureEngineOptions = {}) {
    this.settings = {
      ...DEFAULT_SETTINGS,
      sensitivity: options.sensitivity ?? DEFAULT_SETTINGS.sensitivity,
      dwellTimeMs: options.dwellTimeMs ?? DEFAULT_SETTINGS.dwellTimeMs,
      audioFeedback: options.audioFeedback ?? DEFAULT_SETTINGS.audioFeedback,
      showCursor: options.showCursor ?? DEFAULT_SETTINGS.showCursor,
      showWebcam: options.showWebcam ?? DEFAULT_SETTINGS.showWebcam,
    };
    this.settings.palmHoldMs = options.palmHoldMs ?? DEFAULT_SETTINGS.palmHoldMs;
    this.useVirtualKeyboard = options.virtualKeyboard ?? false;

    this.video = document.createElement("video");
    this.video.style.cssText = "position:fixed;opacity:0;pointer-events:none;width:1px;height:1px;top:-9999px;";
    document.body.appendChild(this.video);

    if (this.useVirtualKeyboard) {
      this.keyboard = new VirtualKeyboard({ dwellTimeMs: this.settings.dwellTimeMs });
    }
    this.guide = new GestureGuide();
    this.toast = new ActionToast();
  }

  on<K extends GestureEventType>(
    event: K,
    handler: (e: GestureEventMap[K]) => void
  ): this {
    const listener = handler as EventListener;
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(listener);
    this.emitter.addEventListener(event, listener);
    return this;
  }

  off<K extends GestureEventType>(
    event: K,
    handler: (e: GestureEventMap[K]) => void
  ): this {
    const listener = handler as EventListener;
    this.listeners.get(event)?.delete(listener);
    this.emitter.removeEventListener(event, listener);
    return this;
  }

  private emit<K extends GestureEventType>(
    event: K,
    detail: GestureEventMap[K] extends CustomEvent<infer D> ? D : never
  ): void {
    this.emitter.dispatchEvent(new CustomEvent(event, { detail }));
    document.dispatchEvent(new CustomEvent(`gesture:${event}`, { detail, bubbles: true }));
  }

  async start(): Promise<void> {
    if (this.settings.showCursor) {
      this.overlay = new CursorOverlay(this.settings.showWebcam);
      if (this.settings.showWebcam) {
        const container = this.overlay.getWebcamContainer();
        if (container) {
          container.appendChild(this.video);
          this.webcamCanvas = document.createElement("canvas");
          this.webcamCanvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
          container.appendChild(this.webcamCanvas);
          this.video.style.cssText = "width:100%;height:100%;object-fit:cover;opacity:1;transform:scaleX(-1);";
        }
      }
    }

    this.tracker = new HandTracker(
      this.video,
      this.webcamCanvas,
      this.settings.sensitivity,
      (frame) => this.onFrame(frame.landmarks, frame.fps),
      (status, msg) => {
        if (status === "ready") {
          this.state.isTracking = true;
          this.emit("ready", { message: "Gesture engine ready" });
          this.guide?.showIfFirstTime();
        } else if (status === "error") {
          this.emit("error", { message: msg ?? "Unknown error" });
        }
      }
    );

    await this.tracker.init();
    await this.tracker.startCamera();
  }

  stop(): void {
    this.tracker?.stop();
    this.state.isTracking = false;
    this.overlay?.hideCursor();
  }

  destroy(): void {
    this.tracker?.destroy();
    this.overlay?.destroy();
    this.keyboard?.destroy();
    this.guide?.destroy();
    this.toast?.destroy();
    this.video.remove();
    this.listeners.forEach((set, event) => {
      set.forEach((l) => this.emitter.removeEventListener(event, l));
    });
    this.listeners.clear();
  }

  updateSettings(partial: Partial<GestureSettings>): void {
    this.settings = { ...this.settings, ...partial };
  }

  getState(): Readonly<GestureState> {
    return this.state;
  }

  private smoothGesture(detected: GestureType): GestureType {
    this.gestureBuffer.push(detected);
    if (this.gestureBuffer.length > 4) this.gestureBuffer.shift();
    const counts: Partial<Record<GestureType, number>> = {};
    for (const g of this.gestureBuffer) counts[g] = (counts[g] ?? 0) + 1;
    let best: GestureType = "NONE";
    let bestCount = 0;
    for (const [g, c] of Object.entries(counts) as [GestureType, number][]) {
      if (c > bestCount) { best = g; bestCount = c; }
    }
    return bestCount >= 2 ? best : "NONE";
  }

  private findScrollContainer(x?: number, y?: number, axis: "y" | "x" = "y"): Element | null {
    const canScrollY = (el: Element) => {
      const s = getComputedStyle(el);
      return (s.overflowY === "auto" || s.overflowY === "scroll") && el.scrollHeight > el.clientHeight + 10;
    };
    const canScrollX = (el: Element) => {
      const s = getComputedStyle(el);
      return (s.overflowX === "auto" || s.overflowX === "scroll") && el.scrollWidth > el.clientWidth + 10;
    };
    const check = axis === "y" ? canScrollY : canScrollX;

    if (x !== undefined && y !== undefined) {
      let el = document.elementFromPoint(x, y);
      while (el && el !== document.documentElement) {
        if (check(el)) return el;
        el = el.parentElement;
      }
      const root = document.documentElement;
      if (axis === "y" && root.scrollHeight > window.innerHeight + 10) return root;
      if (axis === "x" && root.scrollWidth  > window.innerWidth  + 10) return root;
    }
    for (const el of Array.from(document.querySelectorAll("*"))) {
      if (check(el)) return el;
    }
    return null;
  }

  private onFrame(landmarks: NormalizedLandmark[] | null, fps: number): void {
    if (!landmarks) {
      const prev = this.previousGesture;
      const smoothed = this.smoothGesture("NONE");
      if (prev !== smoothed) this.emit("change", { gesture: smoothed, confidence: 0, previous: prev });
      this.previousGesture = smoothed;
      this.smoothCursor = null;
      this.prevTwoFingerY = null;
      this.overlay?.hideCursor();
      this.state = { ...this.state, currentGesture: "NONE", confidence: 0, cursorPosition: null, fps };
      return;
    }

    const { gesture, confidence } = detectGesture(landmarks, this.settings.sensitivity);
    const smoothed = this.smoothGesture(gesture);
    const prev = this.previousGesture;

    if (prev !== smoothed) {
      this.emit("change", { gesture: smoothed, confidence, previous: prev });
      this.previousGesture = smoothed;
    }

    // FIST: pause / resume all gesture processing
    const now = Date.now();
    if (smoothed === "FIST") {
      if (!this.fistHoldStart) this.fistHoldStart = now;
      const held = now - this.fistHoldStart;
      if (this.pausedUntil > now) {
        // Already paused — hold fist 1s to resume early
        if (held > 1000) {
          this.pausedUntil = 0;
          this.fistHoldStart = null;
          this.overlay?.setPaused(false);
          this.toast?.show("▶️", "Gestures resumed");
          this.emit("resume", {});
        }
      } else {
        // Not paused — hold fist 2s to pause
        if (held > 2000) {
          this.pausedUntil = now + 30000;
          this.fistHoldStart = null;
          this.overlay?.setPaused(true);
          this.overlay?.hideCursor();
          this.overlay?.clearHighlight();
          this.toast?.show("✊", "Gestures paused — make a fist again to resume");
          this.emit("pause", { duration: 30000 });
        }
      }
    } else {
      this.fistHoldStart = null;
    }

    if (this.pausedUntil > now) {
      this.overlay?.hideCursor();
      return;
    }

    const indexTip = landmarks[8];
    let cursorPos: { x: number; y: number } | null = null;

    if (smoothed === "POINT_FINGER" && indexTip) {
      const raw = {
        x: (1 - indexTip.x) * window.innerWidth,
        y: indexTip.y * window.innerHeight,
      };
      const prev = this.smoothCursor;
      const alpha = 0.3;
      if (!prev) {
        cursorPos = raw;
      } else {
        const ex = prev.x + alpha * (raw.x - prev.x);
        const ey = prev.y + alpha * (raw.y - prev.y);
        const d = Math.sqrt((ex - prev.x) ** 2 + (ey - prev.y) ** 2);
        cursorPos = d < 2 ? prev : { x: ex, y: ey };
      }
      this.smoothCursor = cursorPos;
      this.overlay?.moveCursor(cursorPos.x, cursorPos.y, smoothed);
      this.overlay?.highlightAt(cursorPos.x, cursorPos.y);
      this.emit("cursor", cursorPos);
      this.handleDwell(cursorPos.x, cursorPos.y);
    } else {
      this.smoothCursor = null;
      this.dwellStart = null;
      this.lastDwellTarget = null;
      this.overlay?.hideCursor();
      this.overlay?.clearHighlight();
    }

    if (smoothed === "PINCH" && this.settings.pinchEnabled) {
      if (now - this.lastPinchTime > PINCH_DEBOUNCE_MS) {
        this.lastPinchTime = now;
        if (cursorPos) {
          if (this.settings.audioFeedback) playSound("select");
          this.emit("pinch", { x: cursorPos.x, y: cursorPos.y });
          const el = document.elementFromPoint(cursorPos.x, cursorPos.y);
          const label = (el as HTMLElement)?.textContent?.trim().slice(0, 28) || "Clicked";
          this.toast?.show("🤏", label);
          this.simulateClick(cursorPos.x, cursorPos.y);
        }
      }
    }

    if (smoothed === "OPEN_PALM" && this.settings.openPalmEnabled) {
      // Ignore palm during post-fire cooldown so popup doesn't reappear immediately
      if (now < this.palmFireCooldownUntil) {
        this.palmHoldStart = null;
      } else {
        const SILENT_MS = 1500;           // 1.5s silent phase before popup appears
        const COUNTDOWN_MS = this.settings.palmHoldMs; // 5s visible countdown

        if (this.palmHoldStart === null) this.palmHoldStart = now;
        const elapsed = now - this.palmHoldStart;

        if (elapsed < SILENT_MS) {
          // Silent phase — popup must stay hidden (user may have just flashed palm)
          this.overlay?.hidePalmCountdown();
        } else {
          // Countdown phase — show popup and count down
          const countdownElapsed = elapsed - SILENT_MS;
          const progress = Math.min(1, countdownElapsed / COUNTDOWN_MS);
          const secondsLeft = Math.ceil((COUNTDOWN_MS - countdownElapsed) / 1000);
          this.emit("palmProgress", { progress, secondsLeft });
          this.overlay?.showPalmCountdown(progress, secondsLeft);

          if (progress >= 1) {
            // Fire!
            this.palmHoldStart = null;
            this.palmFireCooldownUntil = now + 4000; // 4s cooldown before palm can fire again
            this.overlay?.hidePalmCountdown();
            if (this.settings.audioFeedback) playSound("home");
            this.toast?.show("🏠", "Going home");
            this.emit("palm", {});
          }
        }
      }
    } else {
      // Palm removed — reset immediately, hide popup right away
      if (this.palmHoldStart !== null) {
        this.palmHoldStart = null;
        this.overlay?.hidePalmCountdown();
      }
    }

    if (smoothed === "TWO_FINGER" && this.settings.twoFingerEnabled) {
      const rawMidY = (landmarks[8].y + landmarks[12].y) / 2;
      const mirroredMidX = 1 - (landmarks[8].x + landmarks[12].x) / 2;
      const handX = mirroredMidX * window.innerWidth;
      const handY = rawMidY * window.innerHeight;

      if (this.prevTwoFingerY !== null && this.prevTwoFingerX !== null) {
        const deltaY = (rawMidY      - this.prevTwoFingerY) * window.innerHeight * 5;
        const deltaX = (mirroredMidX - this.prevTwoFingerX) * window.innerWidth  * 5;
        const absY = Math.abs(deltaY);
        const absX = Math.abs(deltaX);

        if (absY > 1 || absX > 1) {
          this.emit("twofinger", { deltaY, deltaX });
          if (absY >= absX) {
            // dominant vertical
            this.overlay?.showScrollIndicator(handX, handY, "v");
            const el = this.findScrollContainer(handX, handY, "y");
            el?.scrollBy({ top: deltaY, behavior: "instant" as ScrollBehavior });
          } else {
            // dominant horizontal
            this.overlay?.showScrollIndicator(handX, handY, "h");
            const el = this.findScrollContainer(handX, handY, "x");
            el?.scrollBy({ left: deltaX, behavior: "instant" as ScrollBehavior });
          }
        }
      }

      this.prevTwoFingerY = rawMidY;
      this.prevTwoFingerX = mirroredMidX;
    } else {
      this.prevTwoFingerY = null;
      this.prevTwoFingerX = null;
      this.overlay?.hideScrollIndicator();
    }

    this.state = {
      currentGesture: smoothed,
      confidence,
      cursorPosition: cursorPos,
      fps,
      isTracking: true,
    };
  }

  private handleDwell(x: number, y: number): void {
    // Find dwell target: explicit attr OR auto-detected interactive element
    let dwellEl: Element | null = null;
    let el: Element | null = document.elementFromPoint(x, y);
    while (el && el !== document.documentElement) {
      if (el.hasAttribute("data-gesture-dwell") || this.isAutoGestureTarget(el)) {
        dwellEl = el;
        break;
      }
      el = el.parentElement;
    }

    if (!dwellEl) {
      this.dwellStart = null;
      this.lastDwellTarget = null;
      this.overlay?.setDwellProgress(0);
      return;
    }

    if (dwellEl !== this.lastDwellTarget) {
      this.dwellStart = Date.now();
      this.lastDwellTarget = dwellEl;
      if (this.settings.audioFeedback) playSound("hover");
    }

    if (this.dwellStart !== null) {
      const elapsed = Date.now() - this.dwellStart;
      const progress = Math.min(1, elapsed / this.settings.dwellTimeMs);
      this.overlay?.setDwellProgress(progress);

      if (progress >= 1) {
        if (this.settings.audioFeedback) playSound("dwell");
        this.emit("dwell", { x, y, target: dwellEl, progress: 1 });
        const label = (dwellEl as HTMLElement).textContent?.trim().slice(0, 28) || "element";
        this.toast?.show("⏱", `Activated: ${label}`);
        this.fireClick(dwellEl as HTMLElement, x, y);
        this.dwellStart = null;
        this.overlay?.setDwellProgress(0);
      } else {
        this.emit("dwell", { x, y, target: dwellEl, progress });
      }
    }
  }

  private isAutoGestureTarget(el: Element): boolean {
    const tag = el.tagName.toLowerCase();
    const role = el.getAttribute("role") ?? "";
    const inputType = tag === "input" ? (el as HTMLInputElement).type : "";
    return (
      tag === "button" || tag === "a" ||
      (tag === "input" && !["text","search","email","password","number","tel","url"].includes(inputType)) ||
      tag === "select" ||
      ["button","link","menuitem","tab","option","treeitem","checkbox","radio"].includes(role) ||
      el.classList.contains("sapMBtn") || el.classList.contains("sapMLIB") ||
      el.classList.contains("sapMTabBarItem") || el.classList.contains("sapMListItem")
    );
  }

  private simulateClick(x: number, y: number): void {
    let el = document.elementFromPoint(x, y) as HTMLElement | null;
    while (el && el !== document.body) {
      const tag = el.tagName.toLowerCase();
      const role = el.getAttribute("role");
      if (
        tag === "button" || tag === "a" || tag === "input" || tag === "select" ||
        role === "button" || role === "link" || role === "menuitem" ||
        role === "option" || role === "tab" || role === "listitem" ||
        el.hasAttribute("data-gesture-click") ||
        el.onclick !== null
      ) {
        this.fireClick(el, x, y);
        return;
      }
      el = el.parentElement;
    }
  }

  /**
   * Dispatch a full pointer → mouse → click event sequence on the target.
   * Plain el.click() is not enough for SAP UI5 and other frameworks that
   * use pointerdown/pointerup listeners instead of (or in addition to) click.
   */
  private fireClick(el: HTMLElement, x: number, y: number): void {
    const shared: MouseEventInit = {
      bubbles: true, cancelable: true, view: window,
      clientX: x, clientY: y, screenX: x, screenY: y,
      button: 0, buttons: 1,
    };
    const pShared: PointerEventInit = {
      ...shared, pointerId: 1, pointerType: "mouse",
      isPrimary: true, width: 1, height: 1,
    };

    el.dispatchEvent(new PointerEvent("pointerover",  { ...pShared, pressure: 0 }));
    el.dispatchEvent(new MouseEvent ("mouseover",  shared));
    el.dispatchEvent(new PointerEvent("pointerdown", { ...pShared, pressure: 0.5 }));
    el.dispatchEvent(new MouseEvent ("mousedown",  { ...shared, buttons: 1 }));
    el.focus?.();
    el.dispatchEvent(new PointerEvent("pointerup",   { ...pShared, pressure: 0, buttons: 0 }));
    el.dispatchEvent(new MouseEvent ("mouseup",   { ...shared, buttons: 0 }));
    el.dispatchEvent(new MouseEvent ("click",     { ...shared, buttons: 0 }));
    el.dispatchEvent(new PointerEvent("pointerout",  { ...pShared, pressure: 0 }));
    el.dispatchEvent(new MouseEvent ("mouseout",  shared));
  }
}
