export interface VoicePage {
  name: string;
  id: string;
}

export interface VoiceAction {
  type: "navigate" | "search" | "click" | "filter" | "scroll" | "unknown";
  page?: string;
  query?: string;
  label?: string;
  value?: string;
  field?: string;
  direction?: "up" | "down";
  message?: string;
}

export interface VoiceCommandOptions {
  geminiApiKey: string;
  /** Static page list — used if getPages is not provided */
  pages?: VoicePage[];
  /**
   * Dynamic page scanner called fresh at each voice trigger.
   * Takes priority over `pages`.  Use this for SAP UI5 / SPA apps
   * where nav items may be lazy-loaded or permission-gated.
   */
  getPages?: () => VoicePage[];
  getCurrentPage?: () => string;
  onAction?: (action: VoiceAction) => boolean | void;
  triggerKey?: string;
  maxRecordMs?: number;
  silenceMs?: number;
}

type EngineState = "idle" | "listening" | "processing";

export class VoiceCommandEngine {
  private opts: Required<Omit<VoiceCommandOptions, "getPages">> & { getPages?: () => VoicePage[] };
  private panel: HTMLDivElement;
  private micBtn: HTMLButtonElement;
  private styleEl: HTMLStyleElement;

  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private state: EngineState = "idle";

  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private animFrame: number | null = null;
  private maxTimer: ReturnType<typeof setTimeout> | null = null;

  private keyHandler: (e: KeyboardEvent) => void;

  constructor(options: VoiceCommandOptions) {
    this.opts = {
      geminiApiKey: options.geminiApiKey,
      pages: options.pages ?? [],
      getPages: options.getPages,
      getCurrentPage: options.getCurrentPage ?? (() => "unknown"),
      onAction: options.onAction ?? (() => {}),
      triggerKey: options.triggerKey ?? "`",
      maxRecordMs: options.maxRecordMs ?? 10000,
      silenceMs: options.silenceMs ?? 2000,
    };

    this.styleEl = this.injectStyles();
    this.panel = this.buildPanel();
    this.micBtn = this.buildMicBtn();

    document.body.appendChild(this.panel);
    document.body.appendChild(this.micBtn);

    this.keyHandler = (e: KeyboardEvent) => {
      if (
        e.key === this.opts.triggerKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        this.toggle();
      }
    };
    document.addEventListener("keydown", this.keyHandler);
  }

  toggle() {
    if (this.state === "idle") this.startListening();
    else if (this.state === "listening") this.stopListening();
  }

  async startListening() {
    if (this.state !== "idle") return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      this.showError("Microphone access denied");
      return;
    }

    this.state = "listening";
    this.chunks = [];
    this.setPanel("listening");
    this.setMicBtn("listening");

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";

    this.recorder = new MediaRecorder(this.stream, { mimeType });
    this.recorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.recorder.start(200);

    this.setupSilenceDetector();
    this.maxTimer = setTimeout(
      () => this.stopListening(),
      this.opts.maxRecordMs
    );
  }

  private setupSilenceDetector() {
    if (!this.stream) return;
    try {
      this.audioCtx = new AudioContext();
      const src = this.audioCtx.createMediaStreamSource(this.stream);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      src.connect(this.analyser);

      const buf = new Uint8Array(this.analyser.frequencyBinCount);
      let silentSince: number | null = null;

      const tick = () => {
        if (this.state !== "listening") return;
        this.analyser!.getByteFrequencyData(buf);
        const rms = Math.sqrt(
          buf.reduce((s, v) => s + v * v, 0) / buf.length
        );
        if (rms < 8) {
          if (silentSince === null) silentSince = Date.now();
          else if (Date.now() - silentSince > this.opts.silenceMs) {
            this.stopListening();
            return;
          }
        } else {
          silentSince = null;
        }
        this.animFrame = requestAnimationFrame(tick);
      };
      this.animFrame = requestAnimationFrame(tick);
    } catch {
    }
  }

  stopListening() {
    if (this.state !== "listening") return;
    this.state = "processing";

    if (this.maxTimer) clearTimeout(this.maxTimer);
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }

    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.onstop = () => this.processAudio();
      this.recorder.stop();
    }

    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  private async processAudio() {
    const blob = new Blob(this.chunks, { type: "audio/webm" });

    if (blob.size < 1000) {
      this.hidePanel();
      this.resetState();
      return;
    }

    this.setPanel("processing");
    this.setMicBtn("processing");

    try {
      const b64 = await this.toBase64(blob);
      const result = await this.callGemini(b64);
      await this.runActions(result.transcript, result.actions ?? []);
    } catch (err) {
      this.showError(err instanceof Error ? err.message : "AI error");
    } finally {
      this.resetState();
    }
  }

  private async callGemini(
    b64Audio: string
  ): Promise<{ transcript: string; actions: VoiceAction[] }> {
    // Scan live DOM at trigger time — always reflects current app state
    const pages = this.opts.getPages
      ? this.opts.getPages()
      : (this.opts.pages ?? []);
    const pageList = pages
      .map((p) => `${p.name} (id: ${p.id})`)
      .join(", ");
    const currentPage = this.opts.getCurrentPage();

    const prompt = `You are a voice UI controller for a SAP Fiori web application.
Available pages: ${pageList || "unknown"}.
Current page: ${currentPage}.

Listen to the audio, transcribe it exactly, then parse the command into sequential UI actions.

Action types (use ONLY these):
- {"type":"navigate","page":"<id>"} — navigate to a page using its exact id
- {"type":"search","query":"<text>"} — type text into the search/filter field
- {"type":"click","label":"<text>"} — click a button or link by its visible text
- {"type":"filter","field":"<name>","value":"<val>"} — apply a named filter
- {"type":"scroll","direction":"up"|"down"} — scroll the page

Return ONLY valid JSON, no markdown, no explanation:
{"transcript":"<exact spoken words>","actions":[<action>, ...]}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.opts.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  inline_data: {
                    mime_type: "audio/webm",
                    data: b64Audio,
                  },
                },
                { text: prompt },
              ],
            },
          ],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini ${res.status}: ${errText.slice(0, 120)}`);
    }

    const data = await res.json();
    const text: string =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    try {
      return JSON.parse(text);
    } catch {
      return { transcript: text, actions: [] };
    }
  }

  private async runActions(transcript: string, actions: VoiceAction[]) {
    this.setPanel("done", transcript, actions);

    for (const action of actions) {
      const prevented = this.opts.onAction(action);
      if (prevented) {
        await sleep(600);
        continue;
      }

      switch (action.type) {
        case "navigate":
          document.dispatchEvent(
            new CustomEvent("gesture:voice:navigate", {
              detail: { page: action.page },
            })
          );
          await sleep(700);
          break;
        case "search":
          await this.execSearch(action.query ?? "");
          break;
        case "click":
          this.execClick(action.label ?? "");
          await sleep(400);
          break;
        case "scroll":
          window.scrollBy({
            top: action.direction === "down" ? 400 : -400,
            behavior: "smooth",
          });
          await sleep(400);
          break;
        case "filter":
          await this.execFilter(action.field ?? "", action.value ?? "");
          break;
        default:
          await sleep(400);
      }
    }

    setTimeout(() => this.hidePanel(), 3500);
  }

  private async execSearch(query: string) {
    await sleep(400);
    const sel = [
      'input[type="search"]',
      'input[data-voice-search]',
      'input[placeholder*="earch" i]',
      'input[placeholder*="ilter" i]',
    ].join(",");
    const input = document.querySelector<HTMLInputElement>(sel);
    if (input) {
      input.focus();
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value"
      )?.set;
      setter?.call(input, query);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  private execClick(label: string) {
    const lower = label.toLowerCase();
    const candidates = document.querySelectorAll<HTMLElement>(
      "button, a, [role=button], [role=tab], [role=menuitem]"
    );
    for (const el of candidates) {
      if (el.textContent?.toLowerCase().includes(lower)) {
        el.click();
        break;
      }
    }
  }

  private async execFilter(field: string, value: string) {
    await sleep(400);
    const sel = document.querySelector<HTMLSelectElement>(
      `select[data-field="${field}"], select[name="${field}"]`
    );
    if (sel) {
      sel.value = value;
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  private toBase64(blob: Blob): Promise<string> {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res((r.result as string).split(",")[1]);
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }

  private resetState() {
    this.state = "idle";
    this.setMicBtn("idle");
  }

  private buildPanel(): HTMLDivElement {
    const el = document.createElement("div");
    el.className = "vce-panel";
    el.style.display = "none";
    return el;
  }

  private buildMicBtn(): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.className = "vce-mic-btn";
    btn.innerHTML = "🎤";
    btn.title = "Voice command (\` key)";
    btn.type = "button";
    btn.addEventListener("click", () => this.toggle());
    return btn;
  }

  private setPanel(
    mode: "listening" | "processing" | "done",
    transcript?: string,
    actions?: VoiceAction[]
  ) {
    const p = this.panel;
    p.style.display = "block";
    p.className = `vce-panel vce-panel--${mode}`;
    p.innerHTML = "";

    const header = el("div", "vce-header");

    if (mode === "listening") {
      header.innerHTML =
        `<span class="vce-pulse">🎤</span>` +
        `<span class="vce-title">Listening…</span>` +
        `<button class="vce-stop" id="vce-stop-btn">■&nbsp;Stop</button>`;
      p.appendChild(header);

      const hint = el("div", "vce-hint");
      hint.textContent = 'Speak your command, e.g. "open Reports and search software"';
      p.appendChild(hint);

      const wave = el("div", "vce-wave");
      for (let i = 0; i < 5; i++) wave.appendChild(el("span"));
      p.appendChild(wave);

      p.querySelector("#vce-stop-btn")?.addEventListener("click", () =>
        this.stopListening()
      );
    } else if (mode === "processing") {
      header.innerHTML =
        `<span class="vce-spin">⚙️</span>` +
        `<span class="vce-title">Processing…</span>`;
      p.appendChild(header);
      if (transcript) {
        const t = el("div", "vce-transcript");
        t.textContent = `"${transcript}"`;
        p.appendChild(t);
      }
    } else {
      header.innerHTML =
        `<span>✅</span>` +
        `<span class="vce-title">Done</span>`;
      p.appendChild(header);

      if (transcript) {
        const t = el("div", "vce-transcript");
        t.textContent = `"${transcript}"`;
        p.appendChild(t);
      }

      const list = el("div", "vce-actions");
      for (const a of actions ?? []) {
        const row = el("div", "vce-action");
        row.innerHTML = this.actionHtml(a);
        list.appendChild(row);
      }
      p.appendChild(list);
    }
  }

  private actionHtml(a: VoiceAction): string {
    switch (a.type) {
      case "navigate":
        return `↗ Navigate to <b>${a.page}</b>`;
      case "search":
        return `🔍 Search for <b>${a.query}</b>`;
      case "click":
        return `👆 Click <b>${a.label}</b>`;
      case "filter":
        return `🔽 Filter ${a.field ?? ""} = <b>${a.value}</b>`;
      case "scroll":
        return `📜 Scroll ${a.direction}`;
      default:
        return `❓ ${a.message ?? "Unknown action"}`;
    }
  }

  private hidePanel() {
    this.panel.style.display = "none";
  }

  private showError(msg: string) {
    const p = this.panel;
    p.style.display = "block";
    p.className = "vce-panel vce-panel--error";
    p.innerHTML = `<div class="vce-header"><span>❌</span><span class="vce-title">${msg}</span></div>`;
    this.resetState();
    setTimeout(() => this.hidePanel(), 4000);
  }

  private setMicBtn(s: EngineState) {
    this.micBtn.className = `vce-mic-btn vce-mic-btn--${s}`;
    const icons: Record<EngineState, string> = {
      idle: "🎤",
      listening: "🔴",
      processing: "⚙️",
    };
    this.micBtn.innerHTML = icons[s];
    const tips: Record<EngineState, string> = {
      idle: "Voice command (\` key to start)",
      listening: "Click or \` to stop recording",
      processing: "Processing…",
    };
    this.micBtn.title = tips[s];
  }

  private injectStyles(): HTMLStyleElement {
    const s = document.createElement("style");
    s.id = "gesture-vce-styles";
    s.textContent = `
      .vce-mic-btn {
        position: fixed;
        bottom: 76px;
        right: 20px;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: #1d2d3e;
        border: 2px solid #0070f2;
        color: #fff;
        font-size: 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9000;
        box-shadow: 0 4px 20px rgba(0,0,0,0.45);
        transition: transform .15s, background .15s;
        outline: none;
        user-select: none;
      }
      .vce-mic-btn:hover { transform: scale(1.12); background: #253d54; }
      .vce-mic-btn--listening {
        background: #b71c1c !important;
        border-color: #ef9a9a !important;
        animation: vce-pulse 0.9s ease-in-out infinite;
      }
      .vce-mic-btn--processing { background: #37474f !important; border-color: #90a4ae !important; }

      .vce-panel {
        position: fixed;
        bottom: 136px;
        right: 20px;
        width: 300px;
        background: #1a2a3a;
        border: 1.5px solid #0070f2;
        border-radius: 14px;
        padding: 14px 16px;
        z-index: 9001;
        box-shadow: 0 12px 40px rgba(0,0,0,0.55);
        color: #e0eaff;
        font-family: "72", Arial, Helvetica, sans-serif;
        font-size: 13px;
        animation: vce-up .2s ease;
      }
      .vce-panel--listening { border-color: #ef9a9a; }
      .vce-panel--done      { border-color: #66bb6a; }
      .vce-panel--error     { border-color: #ef5350; }

      .vce-header {
        display: flex;
        align-items: center;
        gap: 9px;
        margin-bottom: 9px;
      }
      .vce-title { font-weight: 700; font-size: 14px; flex: 1; }
      .vce-stop {
        background: rgba(239,154,154,.15);
        border: 1px solid rgba(239,154,154,.4);
        color: #ef9a9a;
        border-radius: 6px;
        padding: 2px 8px;
        font-size: 11px;
        cursor: pointer;
        font-family: inherit;
      }
      .vce-hint { color: #7fa8c8; font-size: 12px; line-height: 1.5; margin-bottom: 10px; }
      .vce-transcript {
        color: #90caf9;
        font-style: italic;
        font-size: 12px;
        line-height: 1.5;
        margin-bottom: 8px;
      }
      .vce-actions { display: flex; flex-direction: column; gap: 5px; }
      .vce-action {
        background: rgba(0,112,242,.14);
        border: 1px solid rgba(0,112,242,.3);
        border-radius: 7px;
        padding: 5px 10px;
        font-size: 12px;
        color: #b3d4ff;
        animation: vce-up .2s ease;
      }
      .vce-wave { display: flex; align-items: center; gap: 4px; height: 28px; }
      .vce-wave span {
        flex: 1;
        background: #0070f2;
        border-radius: 3px;
        animation: vce-wave .7s ease-in-out infinite;
      }
      .vce-wave span:nth-child(2){animation-delay:.1s}
      .vce-wave span:nth-child(3){animation-delay:.2s}
      .vce-wave span:nth-child(4){animation-delay:.3s}
      .vce-wave span:nth-child(5){animation-delay:.4s}

      .vce-pulse { display:inline-block; animation: vce-pulse .9s ease-in-out infinite; }
      .vce-spin  { display:inline-block; animation: vce-spin 1s linear infinite; }

      @keyframes vce-pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
      @keyframes vce-spin  { to { transform: rotate(360deg); } }
      @keyframes vce-wave  { 0%,100%{ height:5px } 50%{ height:22px } }
      @keyframes vce-up    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
    `;
    document.head.appendChild(s);
    return s;
  }

  destroy() {
    if (this.state === "listening") this.stopListening();
    document.removeEventListener("keydown", this.keyHandler);
    this.panel.remove();
    this.micBtn.remove();
    this.styleEl.remove();
  }
}

function el(tag: string, cls: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
