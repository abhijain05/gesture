const CURSOR_CSS = `
.gcore-overlay {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2147483647;
  overflow: hidden;
}
.gcore-cursor {
  position: absolute;
  width: 28px;
  height: 28px;
  transform: translate(-50%, -50%);
  transition: opacity 0.2s;
}
.gcore-cursor-dot {
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  background: rgba(0, 112, 242, 0.9);
  box-shadow: 0 0 8px rgba(0, 112, 242, 0.6);
  transition: background 0.15s, transform 0.15s;
}
.gcore-cursor-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(0, 112, 242, 0.5);
  animation: gcore-pulse 1.2s ease-in-out infinite;
}
.gcore-cursor--pinch .gcore-cursor-dot {
  background: rgba(255, 100, 0, 0.9);
  transform: scale(1.4);
  box-shadow: 0 0 12px rgba(255, 100, 0, 0.7);
}
.gcore-cursor--palm .gcore-cursor-dot {
  background: rgba(50, 200, 100, 0.9);
  transform: scale(1.6);
  box-shadow: 0 0 14px rgba(50, 200, 100, 0.7);
}
.gcore-dwell-ring {
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 3px solid rgba(0, 112, 242, 0.8);
  clip-path: none;
  transform: rotate(-90deg);
  opacity: 0;
  transition: opacity 0.15s;
}
.gcore-dwell-ring--active {
  opacity: 1;
}
.gcore-webcam {
  position: fixed;
  bottom: 16px;
  right: 16px;
  width: 160px;
  height: 120px;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid rgba(0, 112, 242, 0.5);
  background: #000;
  box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  pointer-events: auto;
  z-index: 2147483646;
  transition: box-shadow 0.15s, border-color 0.15s;
  user-select: none;
}
.gcore-webcam:hover {
  border-color: rgba(0, 112, 242, 0.9);
  box-shadow: 0 6px 28px rgba(0,0,0,0.55);
}
.gcore-webcam.gcore-webcam--dragging {
  box-shadow: 0 12px 40px rgba(0,0,0,0.7);
  border-color: rgba(0, 112, 242, 1);
  opacity: 0.92;
  transition: none;
}
.gcore-webcam-handle {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 22px;
  background: linear-gradient(180deg, rgba(0,0,0,0.65) 0%, transparent 100%);
  cursor: grab;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
}
.gcore-webcam-handle:active { cursor: grabbing; }
.gcore-webcam-handle-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(255,255,255,0.55);
}
.gcore-webcam video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
}
.gcore-webcam canvas {
  position: absolute;
  inset: 0;
  transform: scaleX(-1);
}
.gcore-badge {
  position: fixed;
  bottom: 16px;
  left: 16px;
  background: rgba(0, 112, 242, 0.9);
  color: white;
  font-family: "72", "72full", Arial, Helvetica, sans-serif;
  font-size: 11px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 12px;
  pointer-events: none;
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 6px;
  letter-spacing: 0.03em;
  box-shadow: 0 2px 8px rgba(0, 112, 242, 0.4);
}
.gcore-badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #7fff7f;
  animation: gcore-blink 1.5s ease-in-out infinite;
}
@keyframes gcore-pulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.6); opacity: 0.1; }
}
@keyframes gcore-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
.gcore-scroll-indicator {
  position: fixed;
  width: 44px;
  height: 44px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 2147483647;
  opacity: 0;
  transition: opacity 0.15s;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}
.gcore-scroll-indicator--visible { opacity: 1; }
.gcore-scroll-indicator-inner {
  background: rgba(0, 112, 242, 0.85);
  border-radius: 50%;
  width: 38px;
  height: 38px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  box-shadow: 0 0 0 3px rgba(0,112,242,0.25), 0 3px 12px rgba(0,0,0,0.4);
}
.gcore-scroll-arrow {
  width: 0;
  height: 0;
}
.gcore-scroll-arrow--up { border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 6px solid rgba(255,255,255,0.9); }
.gcore-scroll-arrow--down { border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 6px solid rgba(255,255,255,0.9); }
.gcore-scroll-arrow--left { border-top: 5px solid transparent; border-bottom: 5px solid transparent; border-right: 6px solid rgba(255,255,255,0.9); }
.gcore-scroll-arrow--right { border-top: 5px solid transparent; border-bottom: 5px solid transparent; border-left: 6px solid rgba(255,255,255,0.9); }
.gcore-scroll-indicator-inner--h { flex-direction: row; }
.gcore-scroll-label {
  position: absolute;
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  font-weight: 700;
  color: rgba(0,112,242,0.95);
  white-space: nowrap;
  letter-spacing: 0.04em;
  text-shadow: 0 1px 3px rgba(0,0,0,0.5);
}
.gcore-palm-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.gcore-palm-overlay--visible { opacity: 1; }
.gcore-palm-card {
  background: rgba(10, 20, 35, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 2px solid rgba(16, 126, 62, 0.7);
  border-radius: 20px;
  padding: 32px 48px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  box-shadow: 0 0 60px rgba(16,126,62,0.25), 0 8px 40px rgba(0,0,0,0.6);
}
.gcore-palm-icon {
  font-size: 52px;
  line-height: 1;
  filter: drop-shadow(0 0 12px rgba(16,126,62,0.8));
  animation: gcore-palm-wave 0.8s ease-in-out infinite alternate;
}
@keyframes gcore-palm-wave {
  from { transform: rotate(-8deg) scale(1); }
  to   { transform: rotate( 8deg) scale(1.08); }
}
.gcore-palm-title {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 18px;
  font-weight: 700;
  color: #e2e8f0;
  letter-spacing: 0.02em;
}
.gcore-palm-sub {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 13px;
  color: #64748b;
}
.gcore-palm-ring-wrap {
  position: relative;
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.gcore-palm-ring {
  position: absolute;
  inset: 0;
  transform: rotate(-90deg);
}
.gcore-palm-countdown {
  font-family: system-ui, -apple-system, sans-serif;
  font-size: 32px;
  font-weight: 900;
  color: #4ade80;
  line-height: 1;
  text-shadow: 0 0 16px rgba(74,222,128,0.6);
}
`;

export class CursorOverlay {
  private overlay: HTMLDivElement;
  private cursor: HTMLDivElement;
  private cursorDot: HTMLDivElement;
  private dwellRing: SVGSVGElement;
  private webcamContainer: HTMLDivElement | null = null;
  private badge: HTMLDivElement;
  private scrollIndicator: HTMLDivElement;
  private palmOverlay: HTMLDivElement;
  private palmCountdownEl: HTMLElement | null = null;
  private palmRingCircle: SVGCircleElement | null = null;
  private styleEl: HTMLStyleElement;
  private visible = false;

  constructor(private showWebcam: boolean) {
    this.styleEl = document.createElement("style");
    this.styleEl.textContent = CURSOR_CSS;
    document.head.appendChild(this.styleEl);

    this.overlay = document.createElement("div");
    this.overlay.className = "gcore-overlay";

    this.cursor = document.createElement("div");
    this.cursor.className = "gcore-cursor";
    this.cursor.style.opacity = "0";

    this.cursorDot = document.createElement("div");
    this.cursorDot.className = "gcore-cursor-dot";

    const ring = document.createElement("div");
    ring.className = "gcore-cursor-ring";

    this.dwellRing = document.createElementNS("http://www.w3.org/2000/svg", "svg") as unknown as SVGSVGElement;
    this.dwellRing.setAttribute("viewBox", "0 0 36 36");
    this.dwellRing.style.cssText = "position:absolute;inset:-4px;width:36px;height:36px;transform:rotate(-90deg);opacity:0;transition:opacity 0.15s;pointer-events:none;";

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "18");
    circle.setAttribute("cy", "18");
    circle.setAttribute("r", "15");
    circle.setAttribute("fill", "none");
    circle.setAttribute("stroke", "rgba(0,112,242,0.9)");
    circle.setAttribute("stroke-width", "3");
    circle.setAttribute("stroke-dasharray", "94.2");
    circle.setAttribute("stroke-dashoffset", "94.2");
    this.dwellRing.appendChild(circle);

    this.cursor.appendChild(this.cursorDot);
    this.cursor.appendChild(ring);
    this.cursor.appendChild(this.dwellRing as unknown as Node);
    this.overlay.appendChild(this.cursor);

    this.badge = document.createElement("div");
    this.badge.className = "gcore-badge";
    this.badge.innerHTML = `<span class="gcore-badge-dot"></span>Gesture Control Active`;

    this.scrollIndicator = document.createElement("div");
    this.scrollIndicator.className = "gcore-scroll-indicator";
    this.scrollIndicator.innerHTML = `
      <div class="gcore-scroll-indicator-inner">
        <div class="gcore-scroll-arrow gcore-scroll-arrow--up"></div>
        <div class="gcore-scroll-arrow gcore-scroll-arrow--down"></div>
      </div>
      <span class="gcore-scroll-label">SCROLL</span>
    `;

    // Palm countdown overlay
    this.palmOverlay = document.createElement("div");
    this.palmOverlay.className = "gcore-palm-overlay";
    const CIRC = 220; // 2π × 35
    this.palmOverlay.innerHTML = `
      <div class="gcore-palm-card">
        <div class="gcore-palm-icon">🖐</div>
        <div class="gcore-palm-title">Going Home…</div>
        <div class="gcore-palm-ring-wrap">
          <svg class="gcore-palm-ring" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(74,222,128,0.15)" stroke-width="6"/>
            <circle class="gcore-palm-progress-circle" cx="40" cy="40" r="35" fill="none"
              stroke="#4ade80" stroke-width="6" stroke-linecap="round"
              stroke-dasharray="${CIRC}" stroke-dashoffset="${CIRC}"/>
          </svg>
          <span class="gcore-palm-countdown">5</span>
        </div>
        <div class="gcore-palm-sub">Keep palm open to navigate home</div>
      </div>
    `;
    this.palmCountdownEl = this.palmOverlay.querySelector(".gcore-palm-countdown");
    this.palmRingCircle = this.palmOverlay.querySelector(".gcore-palm-progress-circle");

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.badge);
    document.body.appendChild(this.palmOverlay);
    document.body.appendChild(this.scrollIndicator);

    if (showWebcam) this.initWebcam();
  }

  private initWebcam(): void {
    this.webcamContainer = document.createElement("div");
    this.webcamContainer.className = "gcore-webcam";

    const handle = document.createElement("div");
    handle.className = "gcore-webcam-handle";
    for (let i = 0; i < 5; i++) {
      const dot = document.createElement("span");
      dot.className = "gcore-webcam-handle-dot";
      handle.appendChild(dot);
    }
    this.webcamContainer.appendChild(handle);

    this.makeDraggable(this.webcamContainer, handle);
    document.body.appendChild(this.webcamContainer);
  }

  private makeDraggable(el: HTMLDivElement, handle: HTMLDivElement): void {
    const W = 160, H = 120;
    const STORAGE_KEY = "gcore-webcam-pos";

    const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

    const applyPos = (left: number, top: number) => {
      const maxX = window.innerWidth - W - 4;
      const maxY = window.innerHeight - H - 4;
      const x = clamp(left, 4, maxX);
      const y = clamp(top, 4, maxY);
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      el.style.right = "auto";
      el.style.bottom = "auto";
      return { x, y };
    };

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { x, y } = JSON.parse(saved);
        applyPos(x, y);
      }
    } catch (_) {}

    let dragging = false;
    let startMouseX = 0, startMouseY = 0, startElX = 0, startElY = 0;

    const getElLeft = () => parseInt(el.style.left || "", 10) || (window.innerWidth - W - 16);
    const getElTop  = () => parseInt(el.style.top  || "", 10) || (window.innerHeight - H - 16);

    const onStart = (clientX: number, clientY: number) => {
      dragging = true;
      startMouseX = clientX;
      startMouseY = clientY;
      startElX = getElLeft();
      startElY = getElTop();
      el.classList.add("gcore-webcam--dragging");
      document.body.style.userSelect = "none";
    };

    const onMove = (clientX: number, clientY: number) => {
      if (!dragging) return;
      const { x, y } = applyPos(
        startElX + (clientX - startMouseX),
        startElY + (clientY - startMouseY)
      );
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ x, y })); } catch (_) {}
    };

    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      el.classList.remove("gcore-webcam--dragging");
      document.body.style.userSelect = "";
    };

    handle.addEventListener("mousedown", (e) => { e.preventDefault(); onStart(e.clientX, e.clientY); });
    document.addEventListener("mousemove", (e) => onMove(e.clientX, e.clientY));
    document.addEventListener("mouseup", onEnd);

    handle.addEventListener("touchstart", (e) => { e.preventDefault(); onStart(e.touches[0].clientX, e.touches[0].clientY); }, { passive: false });
    document.addEventListener("touchmove", (e) => { if (dragging) onMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
    document.addEventListener("touchend", onEnd);
  }

  getWebcamContainer(): HTMLDivElement | null {
    return this.webcamContainer;
  }

  moveCursor(x: number, y: number, gesture: string): void {
    this.cursor.style.left = `${x}px`;
    this.cursor.style.top = `${y}px`;

    if (!this.visible) {
      this.cursor.style.opacity = "1";
      this.visible = true;
    }

    this.cursor.className = `gcore-cursor${gesture === "PINCH" ? " gcore-cursor--pinch" : gesture === "OPEN_PALM" ? " gcore-cursor--palm" : ""}`;
  }

  hideCursor(): void {
    if (this.visible) {
      this.cursor.style.opacity = "0";
      this.visible = false;
    }
    this.setDwellProgress(0);
  }

  setDwellProgress(progress: number): void {
    const circle = this.dwellRing.querySelector("circle");
    if (!circle) return;
    const circumference = 94.2;
    const offset = circumference * (1 - progress);
    circle.setAttribute("stroke-dashoffset", String(offset));
    (this.dwellRing as unknown as HTMLElement).style.opacity = progress > 0 ? "1" : "0";
  }

  showPalmCountdown(progress: number, secondsLeft: number): void {
    this.palmOverlay.classList.add("gcore-palm-overlay--visible");
    if (this.palmCountdownEl) this.palmCountdownEl.textContent = String(secondsLeft);
    if (this.palmRingCircle) {
      const CIRC = 220;
      this.palmRingCircle.setAttribute("stroke-dashoffset", String(CIRC * (1 - progress)));
    }
  }

  hidePalmCountdown(): void {
    this.palmOverlay.classList.remove("gcore-palm-overlay--visible");
    if (this.palmRingCircle) this.palmRingCircle.setAttribute("stroke-dashoffset", "220");
    if (this.palmCountdownEl) this.palmCountdownEl.textContent = "5";
  }

  showScrollIndicator(x: number, y: number, direction: "v" | "h" = "v"): void {
    this.scrollIndicator.style.left = `${x}px`;
    this.scrollIndicator.style.top = `${y}px`;
    this.scrollIndicator.classList.add("gcore-scroll-indicator--visible");
    const inner = this.scrollIndicator.querySelector(".gcore-scroll-indicator-inner");
    const label = this.scrollIndicator.querySelector(".gcore-scroll-label");
    if (inner) {
      if (direction === "h") {
        inner.className = "gcore-scroll-indicator-inner gcore-scroll-indicator-inner--h";
        inner.innerHTML = `<div class="gcore-scroll-arrow gcore-scroll-arrow--left"></div><div class="gcore-scroll-arrow gcore-scroll-arrow--right"></div>`;
        if (label) label.textContent = "SCROLL ↔";
      } else {
        inner.className = "gcore-scroll-indicator-inner";
        inner.innerHTML = `<div class="gcore-scroll-arrow gcore-scroll-arrow--up"></div><div class="gcore-scroll-arrow gcore-scroll-arrow--down"></div>`;
        if (label) label.textContent = "SCROLL ↕";
      }
    }
  }

  hideScrollIndicator(): void {
    this.scrollIndicator.classList.remove("gcore-scroll-indicator--visible");
  }

  destroy(): void {
    this.overlay.remove();
    this.badge.remove();
    this.palmOverlay.remove();
    this.scrollIndicator.remove();
    this.webcamContainer?.remove();
    this.styleEl.remove();
  }
}
