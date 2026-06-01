/**
 * StatusBar — a fixed top bar showing gesture status + optional voice toggle.
 * Matches the look of the Gesture UI5 Demo header bar.
 * Works in any web page (plain HTML, SAP UI5, etc.) with no framework needed.
 *
 * Usage:
 *   const bar = new GestureCore.StatusBar({ onVoiceClick: () => voice.toggle() });
 *   bar.mount();
 *   bar.setStatus("active");   // "active" | "loading" | "paused" | "error"
 *   bar.destroy();
 */

export type StatusBarStatus = "loading" | "active" | "paused" | "error";

export interface StatusBarOptions {
  /** Called when the user clicks the "Press 🎤 for voice" button */
  onVoiceClick?: () => void;
  /** Hide the voice button (default: show if onVoiceClick is provided) */
  hideVoice?: boolean;
  /** Initial status (default: "loading") */
  initialStatus?: StatusBarStatus;
}

const STYLE_ID = "gcore-statusbar-styles";

const CSS = `
  .gcore-sb {
    position: fixed !important;
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    height: 44px !important;
    min-height: unset !important;
    max-height: 44px !important;
    width: 100% !important;
    background: #1a2535 !important;
    border-bottom: 1px solid rgba(255,255,255,0.08) !important;
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 12px !important;
    z-index: 2147483647 !important;
    box-shadow: 0 2px 12px rgba(0,0,0,0.4) !important;
    padding: 0 16px !important;
    box-sizing: border-box !important;
    margin: 0 !important;
    overflow: hidden !important;
  }

  .gcore-sb-pill {
    display: inline-flex !important;
    flex-direction: row !important;
    align-items: center !important;
    gap: 7px !important;
    padding: 5px 14px !important;
    border-radius: 20px !important;
    font-family: "72", "72full", Arial, Helvetica, sans-serif !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    letter-spacing: 0.02em !important;
    background: rgba(255,255,255,0.07) !important;
    border: 1.5px solid rgba(255,255,255,0.13) !important;
    color: #e2eaf4 !important;
    white-space: nowrap !important;
    height: 30px !important;
    min-height: unset !important;
    max-height: 30px !important;
    box-sizing: border-box !important;
    line-height: 1 !important;
  }

  .gcore-sb-pill--active {
    background: rgba(34,197,94,0.12) !important;
    border-color: rgba(34,197,94,0.35) !important;
    color: #d1fae5 !important;
  }

  .gcore-sb-pill--loading {
    background: rgba(251,191,36,0.1) !important;
    border-color: rgba(251,191,36,0.3) !important;
    color: #fef3c7 !important;
  }

  .gcore-sb-pill--paused {
    background: rgba(245,158,11,0.1) !important;
    border-color: rgba(245,158,11,0.3) !important;
    color: #fde68a !important;
  }

  .gcore-sb-pill--error {
    background: rgba(239,68,68,0.1) !important;
    border-color: rgba(239,68,68,0.3) !important;
    color: #fecaca !important;
  }

  .gcore-sb-dot {
    width: 8px !important;
    height: 8px !important;
    min-width: 8px !important;
    border-radius: 50% !important;
    background: #94a3b8 !important;
    flex-shrink: 0 !important;
  }

  .gcore-sb-dot--active  { background: #22c55e !important; animation: gcore-sb-blink 1.5s ease-in-out infinite !important; }
  .gcore-sb-dot--loading { background: #fbbf24 !important; animation: gcore-sb-spin 1s linear infinite !important; border-radius: 50% !important; }
  .gcore-sb-dot--paused  { background: #f59e0b !important; }
  .gcore-sb-dot--error   { background: #ef4444 !important; }

  @keyframes gcore-sb-blink {
    0%,100% { opacity: 1; }
    50%      { opacity: 0.35; }
  }
  @keyframes gcore-sb-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  .gcore-sb-voice-btn {
    display: inline-flex !important;
    flex-direction: row !important;
    align-items: center !important;
    gap: 6px !important;
    padding: 5px 14px !important;
    border-radius: 20px !important;
    font-family: "72", "72full", Arial, Helvetica, sans-serif !important;
    font-size: 12px !important;
    font-weight: 500 !important;
    color: #cbd5e1 !important;
    background: rgba(255,255,255,0.06) !important;
    border: 1.5px solid rgba(255,255,255,0.13) !important;
    cursor: pointer !important;
    white-space: nowrap !important;
    height: 30px !important;
    min-height: unset !important;
    max-height: 30px !important;
    box-sizing: border-box !important;
    line-height: 1 !important;
    transition: background 0.15s !important;
    outline: none !important;
    -webkit-appearance: none !important;
    appearance: none !important;
    margin: 0 !important;
  }
  .gcore-sb-voice-btn:hover {
    background: rgba(255,255,255,0.12) !important;
    color: #fff !important;
  }

  .gcore-sb-close {
    position: absolute !important;
    right: 12px !important;
    top: 50% !important;
    transform: translateY(-50%) !important;
    width: 24px !important;
    height: 24px !important;
    min-width: 24px !important;
    min-height: unset !important;
    max-height: 24px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 50% !important;
    border: none !important;
    background: rgba(255,255,255,0.07) !important;
    color: #94a3b8 !important;
    font-size: 14px !important;
    cursor: pointer !important;
    line-height: 1 !important;
    padding: 0 !important;
    outline: none !important;
    transition: background 0.15s !important;
    -webkit-appearance: none !important;
    appearance: none !important;
    margin: 0 !important;
    box-sizing: border-box !important;
  }
  .gcore-sb-close:hover {
    background: rgba(255,255,255,0.15) !important;
    color: #fff !important;
  }
`;

const LABEL: Record<StatusBarStatus, string> = {
  loading: "Loading Gesture Engine…",
  active:  "Gesture Active",
  paused:  "Gestures Paused",
  error:   "Gesture Error",
};

export class StatusBar {
  private bar: HTMLDivElement | null = null;
  private pill: HTMLSpanElement | null = null;
  private dot: HTMLSpanElement | null = null;
  private style: HTMLStyleElement | null = null;
  private status: StatusBarStatus;
  private opts: StatusBarOptions;

  constructor(opts: StatusBarOptions = {}) {
    this.opts = opts;
    this.status = opts.initialStatus ?? "loading";
  }

  mount(): void {
    if (this.bar) return;

    if (!document.getElementById(STYLE_ID)) {
      this.style = document.createElement("style");
      this.style.id = STYLE_ID;
      this.style.textContent = CSS;
      document.head.appendChild(this.style);
    }

    const bar = document.createElement("div");
    bar.className = "gcore-sb";

    const dot = document.createElement("span");
    dot.className = "gcore-sb-dot";

    const pill = document.createElement("span");
    pill.className = "gcore-sb-pill";
    pill.appendChild(dot);
    pill.appendChild(document.createTextNode(LABEL[this.status]));
    bar.appendChild(pill);

    if (this.opts.onVoiceClick && !this.opts.hideVoice) {
      const vBtn = document.createElement("button");
      vBtn.className = "gcore-sb-voice-btn";
      vBtn.type = "button";
      vBtn.innerHTML = "🎤 Press for voice";
      vBtn.addEventListener("click", () => this.opts.onVoiceClick!());
      bar.appendChild(vBtn);
    }

    const closeBtn = document.createElement("button");
    closeBtn.className = "gcore-sb-close";
    closeBtn.type = "button";
    closeBtn.title = "Dismiss";
    closeBtn.textContent = "✕";
    closeBtn.addEventListener("click", () => this.destroy());
    bar.appendChild(closeBtn);

    document.body.appendChild(bar);
    this.bar = bar;
    this.pill = pill;
    this.dot = dot;

    this.applyStatus(this.status);
  }

  setStatus(status: StatusBarStatus): void {
    this.status = status;
    if (this.bar) this.applyStatus(status);
  }

  private applyStatus(status: StatusBarStatus): void {
    if (!this.pill || !this.dot) return;

    const classes = ["loading", "active", "paused", "error"];
    classes.forEach((c) => {
      this.pill!.classList.remove(`gcore-sb-pill--${c}`);
      this.dot!.classList.remove(`gcore-sb-dot--${c}`);
    });

    this.pill.classList.add(`gcore-sb-pill--${status}`);
    this.dot.classList.add(`gcore-sb-dot--${status}`);

    const textNode = Array.from(this.pill.childNodes).find(
      (n) => n.nodeType === Node.TEXT_NODE
    );
    if (textNode) textNode.textContent = LABEL[status];
  }

  destroy(): void {
    this.bar?.remove();
    this.style?.remove();
    this.bar = null;
    this.pill = null;
    this.dot = null;
    this.style = null;
  }
}
