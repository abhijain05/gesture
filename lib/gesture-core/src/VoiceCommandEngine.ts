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

export interface VoiceAlias {
  phrase: string;
  page: string;
}

export interface VoiceSettings {
  wakeWords: string[];
  aliases: VoiceAlias[];
}

export interface VoiceCommandOptions {
  geminiApiKey: string;
  pages?: VoicePage[];
  getPages?: () => VoicePage[];
  getCurrentPage?: () => string;
  onAction?: (action: VoiceAction) => boolean | void;
  triggerKey?: string;
  maxRecordMs?: number;
  silenceMs?: number;
  /** Words that trigger listening without clicking the button. Default: ["tarang"] */
  wakeWords?: string[];
  /** Show the settings gear button. Default: true */
  showSettings?: boolean;
}

type EngineState = "idle" | "listening" | "processing";

const SETTINGS_KEY = "vce_settings_v1";

export class VoiceCommandEngine {
  private opts: Required<Omit<VoiceCommandOptions, "getPages">> & { getPages?: () => VoicePage[] };
  private panel: HTMLDivElement;
  private micBtn: HTMLButtonElement;
  private gearBtn: HTMLButtonElement;
  private settingsEl: HTMLDivElement;
  private styleEl: HTMLStyleElement;

  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  private state: EngineState = "idle";

  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private silenceTimer: ReturnType<typeof setTimeout> | null = null;
  private maxTimer: ReturnType<typeof setTimeout> | null = null;

  private wakeRec: any = null;
  private wakeActive = false;
  private settingsOpen = false;

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
      wakeWords: options.wakeWords ?? ["tarang"],
      showSettings: options.showSettings ?? true,
    };

    this.styleEl   = this.injectStyles();
    this.panel     = this.buildPanel();
    this.micBtn    = this.buildMicBtn();
    this.gearBtn   = this.buildGearBtn();
    this.settingsEl = this.buildSettingsEl();

    document.body.appendChild(this.panel);
    document.body.appendChild(this.micBtn);
    if (this.opts.showSettings) {
      document.body.appendChild(this.gearBtn);
      document.body.appendChild(this.settingsEl);
    }

    this.keyHandler = (e: KeyboardEvent) => {
      if (
        e.key === this.opts.triggerKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        this.toggle();
      }
      if (e.key === "Escape" && this.settingsOpen) {
        this.closeSettings();
      }
    };
    document.addEventListener("keydown", this.keyHandler);

    // Start background wake word listener
    this.startWakeWordListener();
  }

  toggle() {
    if (this.state === "idle") this.startListening();
    else if (this.state === "listening") this.stopListening();
  }

  async startListening() {
    if (this.state !== "idle") return;

    // Pause wake word recogniser before grabbing the mic
    this.pauseWakeWordListener();

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      this.showError("Microphone access denied");
      this.resumeWakeWordListener();
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
    this.maxTimer = setTimeout(() => this.stopListening(), this.opts.maxRecordMs);
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
        const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length);
        if (rms < 8) {
          if (silentSince === null) silentSince = Date.now();
          else if (Date.now() - silentSince > this.opts.silenceMs) {
            this.stopListening();
            return;
          }
        } else {
          silentSince = null;
        }
        this.silenceTimer = setTimeout(tick, 100);
      };
      this.silenceTimer = setTimeout(tick, 100);
    } catch {}
  }

  stopListening() {
    if (this.state !== "listening") return;
    this.state = "processing";

    if (this.maxTimer) clearTimeout(this.maxTimer);
    if (this.silenceTimer) { clearTimeout(this.silenceTimer); this.silenceTimer = null; }
    if (this.audioCtx) { this.audioCtx.close().catch(() => {}); this.audioCtx = null; }

    if (this.recorder && this.recorder.state !== "inactive") {
      this.recorder.onstop = () => this.processAudio();
      this.recorder.stop();
    }

    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
  }

  private async processAudio() {
    const blob = new Blob(this.chunks, { type: "audio/webm" });
    if (blob.size < 1000) { this.hidePanel(); this.resetState(); return; }

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

  private async callGemini(b64Audio: string): Promise<{ transcript: string; actions: VoiceAction[] }> {
    const pages = this.opts.getPages ? this.opts.getPages() : (this.opts.pages ?? []);
    const pageList = pages.map((p) => `${p.name} (id: ${p.id})`).join(", ");
    const currentPage = this.opts.getCurrentPage();

    const settings = this.loadSettings();
    const aliasHints = settings.aliases.length
      ? "\n\nUser-defined phrase aliases (treat these as canonical mappings):\n" +
        settings.aliases.map((a) => `- "${a.phrase}" → navigate to page id "${a.page}"`).join("\n")
      : "";

    const prompt = `You are a voice UI controller for a SAP Fiori web application.
Available pages: ${pageList || "unknown"}.
Current page: ${currentPage}.${aliasHints}

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
          contents: [{ parts: [{ inline_data: { mime_type: "audio/webm", data: b64Audio } }, { text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini ${res.status}: ${errText.slice(0, 120)}`);
    }

    const data = await res.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    try { return JSON.parse(text); }
    catch { return { transcript: text, actions: [] }; }
  }

  private async runActions(transcript: string, actions: VoiceAction[]) {
    this.setPanel("done", transcript, actions);

    for (const action of actions) {
      const prevented = this.opts.onAction(action);
      if (prevented) { await sleep(600); continue; }

      switch (action.type) {
        case "navigate":
          document.dispatchEvent(new CustomEvent("gesture:voice:navigate", { detail: { page: action.page } }));
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
          window.scrollBy({ top: action.direction === "down" ? 400 : -400, behavior: "smooth" });
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
    const sel = ['input[type="search"]','input[data-voice-search]','input[placeholder*="earch" i]','input[placeholder*="ilter" i]'].join(",");
    const input = document.querySelector<HTMLInputElement>(sel);
    if (input) {
      input.focus();
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(input, query);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  private execClick(label: string) {
    const lower = label.toLowerCase();
    const candidates = document.querySelectorAll<HTMLElement>("button, a, [role=button], [role=tab], [role=menuitem]");
    for (const el of candidates) {
      if (el.textContent?.toLowerCase().includes(lower)) { el.click(); break; }
    }
  }

  private async execFilter(field: string, value: string) {
    await sleep(400);
    const sel = document.querySelector<HTMLSelectElement>(`select[data-field="${field}"], select[name="${field}"]`);
    if (sel) { sel.value = value; sel.dispatchEvent(new Event("change", { bubbles: true })); }
  }

  private toBase64(blob: Blob): Promise<string> {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res((r.result as string).split(",")[1]);
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  }

  // ── Wake word listener ───────────────────────────────────────────────

  private startWakeWordListener() {
    const settings = this.loadSettings();
    const words = settings.wakeWords.length ? settings.wakeWords : this.opts.wakeWords;
    if (!words.length) return;

    const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const rec: any = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.maxAlternatives = 3;

    rec.onresult = (event: any) => {
      if (this.state !== "idle") return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        for (let j = 0; j < event.results[i].length; j++) {
          const t = event.results[i][j].transcript.toLowerCase().trim();
          for (const word of words) {
            if (t.includes(word.toLowerCase())) {
              this.startListening();
              return;
            }
          }
        }
      }
    };

    rec.onend = () => {
      if (this.wakeActive) {
        try { rec.start(); } catch {}
      }
    };

    rec.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        this.wakeActive = false;
        return;
      }
      if (this.wakeActive) {
        setTimeout(() => { try { rec.start(); } catch {} }, 1500);
      }
    };

    try {
      rec.start();
      this.wakeRec = rec;
      this.wakeActive = true;
      this.updateWakeBadge(true);
    } catch {}
  }

  private pauseWakeWordListener() {
    if (!this.wakeRec) return;
    this.wakeActive = false;
    try { this.wakeRec.stop(); } catch {}
  }

  private resumeWakeWordListener() {
    if (!this.wakeRec) return;
    this.wakeActive = true;
    try { this.wakeRec.start(); } catch {}
  }

  private stopWakeWordListenerPermanently() {
    this.wakeActive = false;
    try { this.wakeRec?.abort(); } catch {}
    this.wakeRec = null;
    this.updateWakeBadge(false);
  }

  private updateWakeBadge(active: boolean) {
    const badge = document.getElementById("vce-wake-badge");
    if (badge) badge.style.display = active ? "block" : "none";
  }

  // ── Settings persistence ──────────────────────────────────────────────

  private loadSettings(): VoiceSettings {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (!raw) return { wakeWords: [...this.opts.wakeWords], aliases: [] };
      const parsed = JSON.parse(raw) as Partial<VoiceSettings>;
      return {
        wakeWords: parsed.wakeWords ?? [...this.opts.wakeWords],
        aliases: parsed.aliases ?? [],
      };
    } catch {
      return { wakeWords: [...this.opts.wakeWords], aliases: [] };
    }
  }

  private saveSettings(s: VoiceSettings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  }

  // ── Settings panel ────────────────────────────────────────────────────

  private buildGearBtn(): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.id = "vce-gear-btn";
    btn.className = "vce-gear-btn";
    btn.innerHTML = "⚙️";
    btn.title = "Voice settings";
    btn.type = "button";
    btn.addEventListener("click", () => this.toggleSettings());
    return btn;
  }

  private buildSettingsEl(): HTMLDivElement {
    const el = document.createElement("div");
    el.id = "vce-settings";
    el.className = "vce-settings";
    el.style.display = "none";
    this.renderSettings(el);
    return el;
  }

  private toggleSettings() {
    this.settingsOpen ? this.closeSettings() : this.openSettings();
  }

  private openSettings() {
    this.settingsOpen = true;
    this.renderSettings(this.settingsEl);
    this.settingsEl.style.display = "block";
    this.gearBtn.classList.add("vce-gear-btn--open");
  }

  private closeSettings() {
    this.settingsOpen = false;
    this.settingsEl.style.display = "none";
    this.gearBtn.classList.remove("vce-gear-btn--open");
  }

  private renderSettings(container: HTMLDivElement) {
    const s = this.loadSettings();
    const pages = this.opts.getPages ? this.opts.getPages() : (this.opts.pages ?? []);

    container.innerHTML = `
      <div class="vce-set-header">
        <span>🎤 Voice Settings</span>
        <button class="vce-set-close" id="vce-set-close">✕</button>
      </div>

      <div class="vce-set-section">
        <div class="vce-set-label">Wake word(s)</div>
        <div class="vce-set-hint">Say this word to start listening — no button click needed</div>
        <input class="vce-set-input" id="vce-wake-input"
          type="text" value="${s.wakeWords.join(", ")}"
          placeholder='e.g. tarang, hey app'/>
        <div style="display:flex;gap:6px;margin-top:6px">
          <button class="vce-set-btn" id="vce-wake-save">Save</button>
          <span id="vce-wake-status" style="font-size:11px;color:#66bb6a;align-self:center"></span>
        </div>
      </div>

      <div class="vce-set-section">
        <div class="vce-set-label">Custom voice aliases</div>
        <div class="vce-set-hint">Teach the AI your shortcuts — "when I say <em>X</em>, go to page <em>Y</em>"</div>
        <div id="vce-alias-list">
          ${s.aliases.map((a, i) => this.aliasRowHtml(a, i, pages)).join("")}
        </div>
        <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap">
          <input class="vce-set-input" id="vce-alias-phrase" placeholder='Phrase (e.g. "open dash")' style="flex:1;min-width:100px"/>
          <select class="vce-set-select" id="vce-alias-page">
            ${pages.map((p) => `<option value="${p.id}">${p.name}</option>`).join("")}
          </select>
          <button class="vce-set-btn" id="vce-alias-add">+ Add</button>
        </div>
      </div>

      <div class="vce-set-section">
        <div class="vce-set-label">Detected pages <span style="font-size:10px;font-weight:400;color:#7fa8c8">(from current DOM)</span></div>
        <div class="vce-set-pages">
          ${pages.length
            ? pages.map((p) => `<span class="vce-set-page-chip"><b>${p.name}</b> <span style="opacity:.6">${p.id}</span></span>`).join("")
            : '<span style="color:#7fa8c8;font-size:12px">No pages detected yet</span>'}
        </div>
      </div>
    `;

    container.querySelector("#vce-set-close")?.addEventListener("click", () => this.closeSettings());

    container.querySelector("#vce-wake-save")?.addEventListener("click", () => {
      const raw = (container.querySelector("#vce-wake-input") as HTMLInputElement)?.value ?? "";
      const words = raw.split(",").map((w) => w.trim().toLowerCase()).filter(Boolean);
      const updated: VoiceSettings = { ...s, wakeWords: words.length ? words : ["tarang"] };
      this.saveSettings(updated);
      this.stopWakeWordListenerPermanently();
      this.opts.wakeWords = updated.wakeWords;
      this.startWakeWordListener();
      const status = container.querySelector("#vce-wake-status") as HTMLElement;
      status.textContent = "✓ Saved & applied";
      setTimeout(() => { if (status) status.textContent = ""; }, 2000);
    });

    container.querySelector("#vce-alias-add")?.addEventListener("click", () => {
      const phrase = (container.querySelector("#vce-alias-phrase") as HTMLInputElement)?.value.trim();
      const page   = (container.querySelector("#vce-alias-page") as HTMLSelectElement)?.value;
      if (!phrase || !page) return;
      const updated: VoiceSettings = { ...s, aliases: [...s.aliases, { phrase, page }] };
      this.saveSettings(updated);
      this.renderSettings(container);
    });

    container.querySelectorAll("[data-alias-del]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = parseInt((btn as HTMLElement).dataset.aliasDel ?? "");
        if (isNaN(idx)) return;
        const updated: VoiceSettings = { ...s, aliases: s.aliases.filter((_, i) => i !== idx) };
        this.saveSettings(updated);
        this.renderSettings(container);
      });
    });
  }

  private aliasRowHtml(a: VoiceAlias, i: number, pages: VoicePage[]): string {
    const pageName = pages.find((p) => p.id === a.page)?.name ?? a.page;
    return `<div class="vce-alias-row">
      <span class="vce-alias-phrase">"${a.phrase}"</span>
      <span class="vce-alias-arrow">→</span>
      <span class="vce-alias-page">${pageName}</span>
      <button class="vce-alias-del" data-alias-del="${i}" title="Remove">✕</button>
    </div>`;
  }

  // ── State helpers ─────────────────────────────────────────────────────

  private resetState() {
    this.state = "idle";
    this.setMicBtn("idle");
    this.resumeWakeWordListener();
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
    btn.type = "button";
    btn.innerHTML = `🎤<div id="vce-wake-badge" class="vce-wake-badge" title='Say "Tarang" to activate'>●</div>`;
    btn.title = 'Voice command (` key or say "Tarang")';
    btn.addEventListener("click", () => this.toggle());
    return btn;
  }

  private setPanel(mode: "listening" | "processing" | "done", transcript?: string, actions?: VoiceAction[]) {
    const p = this.panel;
    p.style.display = "block";
    p.className = `vce-panel vce-panel--${mode}`;
    p.innerHTML = "";

    const header = mkEl("div", "vce-header");

    if (mode === "listening") {
      header.innerHTML =
        `<span class="vce-pulse">🎤</span>` +
        `<span class="vce-title">Listening…</span>` +
        `<button class="vce-stop" id="vce-stop-btn">■&nbsp;Stop</button>`;
      p.appendChild(header);

      const hint = mkEl("div", "vce-hint");
      hint.textContent = 'Speak your command, e.g. "open Reports" or "search software"';
      p.appendChild(hint);

      const wave = mkEl("div", "vce-wave");
      for (let i = 0; i < 5; i++) wave.appendChild(mkEl("span"));
      p.appendChild(wave);

      p.querySelector("#vce-stop-btn")?.addEventListener("click", () => this.stopListening());
    } else if (mode === "processing") {
      header.innerHTML = `<span class="vce-spin">⚙️</span><span class="vce-title">Processing…</span>`;
      p.appendChild(header);
      if (transcript) {
        const t = mkEl("div", "vce-transcript");
        t.textContent = `"${transcript}"`;
        p.appendChild(t);
      }
    } else {
      header.innerHTML = `<span>✅</span><span class="vce-title">Done</span>`;
      p.appendChild(header);
      if (transcript) {
        const t = mkEl("div", "vce-transcript");
        t.textContent = `"${transcript}"`;
        p.appendChild(t);
      }
      const list = mkEl("div", "vce-actions");
      for (const a of actions ?? []) {
        const row = mkEl("div", "vce-action");
        row.innerHTML = this.actionHtml(a);
        list.appendChild(row);
      }
      p.appendChild(list);
    }
  }

  private actionHtml(a: VoiceAction): string {
    switch (a.type) {
      case "navigate": return `↗ Navigate to <b>${a.page}</b>`;
      case "search":   return `🔍 Search for <b>${a.query}</b>`;
      case "click":    return `👆 Click <b>${a.label}</b>`;
      case "filter":   return `🔽 Filter ${a.field ?? ""} = <b>${a.value}</b>`;
      case "scroll":   return `📜 Scroll ${a.direction}`;
      default:         return `❓ ${a.message ?? "Unknown action"}`;
    }
  }

  private hidePanel() { this.panel.style.display = "none"; }

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
    const icons: Record<EngineState, string> = { idle: "🎤", listening: "🔴", processing: "⚙️" };
    const badge = document.getElementById("vce-wake-badge");
    const badgeHtml = badge ? badge.outerHTML : `<div id="vce-wake-badge" class="vce-wake-badge">●</div>`;
    this.micBtn.innerHTML = icons[s] + (s === "idle" ? badgeHtml : "");
    const tips: Record<EngineState, string> = {
      idle:       'Voice command (` key or say "Tarang")',
      listening:  "Click or ` to stop recording",
      processing: "Processing…",
    };
    this.micBtn.title = tips[s];
  }

  private injectStyles(): HTMLStyleElement {
    const s = document.createElement("style");
    s.id = "gesture-vce-styles";
    s.textContent = `
      /* ── Mic button ───────────────────────────────── */
      .vce-mic-btn {
        position: fixed;
        bottom: 148px;
        right: 20px;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        background: #1d2d3e;
        border: 2px solid #0070f2;
        color: #fff;
        font-size: 22px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483647;
        box-shadow: 0 4px 20px rgba(0,0,0,0.45);
        transition: transform .15s, background .15s;
        outline: none;
        user-select: none;
      }
      .vce-mic-btn:hover { transform: scale(1.1); background: #253d54; }
      .vce-mic-btn--listening {
        background: #b71c1c !important;
        border-color: #ef9a9a !important;
        animation: vce-pulse 0.9s ease-in-out infinite;
      }
      .vce-mic-btn--processing { background: #37474f !important; border-color: #90a4ae !important; }

      /* Wake word active badge */
      .vce-wake-badge {
        position: absolute;
        top: 2px;
        right: 2px;
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background: #4caf50;
        font-size: 0;
        border: 2px solid #1d2d3e;
        display: none;
      }

      /* ── Gear button ─────────────────────────────── */
      .vce-gear-btn {
        position: fixed;
        bottom: 210px;
        right: 20px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(29,45,62,0.9);
        border: 1.5px solid rgba(255,255,255,0.2);
        color: #fff;
        font-size: 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483647;
        box-shadow: 0 2px 12px rgba(0,0,0,0.3);
        transition: transform .2s, background .15s;
        outline: none;
      }
      .vce-gear-btn:hover { transform: rotate(30deg) scale(1.1); background: #253d54; }
      .vce-gear-btn--open { transform: rotate(90deg); border-color: #0070f2; }

      /* ── Main voice panel ────────────────────────── */
      .vce-panel {
        position: fixed !important;
        bottom: 210px !important;
        right: 20px !important;
        top: auto !important;
        left: auto !important;
        width: 300px !important;
        max-width: 300px !important;
        min-width: unset !important;
        height: auto !important;
        min-height: unset !important;
        max-height: 60vh !important;
        background: #1a2a3a !important;
        border: 1.5px solid #0070f2 !important;
        border-radius: 14px !important;
        padding: 14px 16px !important;
        z-index: 2147483647 !important;
        box-shadow: 0 12px 40px rgba(0,0,0,0.55) !important;
        color: #e0eaff !important;
        font-family: "72", Arial, Helvetica, sans-serif !important;
        font-size: 13px !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
        margin: 0 !important;
        animation: vce-up .2s ease;
      }
      .vce-panel--listening { border-color: #ef9a9a !important; }
      .vce-panel--done      { border-color: #66bb6a !important; }
      .vce-panel--error     { border-color: #ef5350 !important; }

      .vce-header { display:flex !important; align-items:center !important; gap:9px !important; margin-bottom:9px !important; flex-direction:row !important; width:auto !important; height:auto !important; }
      .vce-title  { font-weight:700 !important; font-size:14px !important; flex:1 !important; color:#e0eaff !important; }
      .vce-stop   {
        background: rgba(239,154,154,.15) !important; border: 1px solid rgba(239,154,154,.4) !important;
        color: #ef9a9a !important; border-radius:6px !important; padding:2px 8px !important; font-size:11px !important;
        cursor:pointer !important; font-family:inherit !important; height:auto !important; width:auto !important;
      }
      .vce-hint       { color:#7fa8c8 !important; font-size:12px !important; line-height:1.5 !important; margin-bottom:10px !important; display:block !important; }
      .vce-transcript { color:#90caf9 !important; font-style:italic !important; font-size:12px !important; line-height:1.5 !important; margin-bottom:8px !important; display:block !important; }
      .vce-actions    { display:flex !important; flex-direction:column !important; gap:5px !important; }
      .vce-action     {
        background:rgba(0,112,242,.14) !important; border:1px solid rgba(0,112,242,.3) !important;
        border-radius:7px !important; padding:5px 10px !important; font-size:12px !important; color:#b3d4ff !important;
        animation:vce-up .2s ease; display:block !important; height:auto !important;
      }
      .vce-wave { display:flex !important; align-items:center !important; gap:4px !important; height:28px !important; flex-direction:row !important; }
      .vce-wave span {
        flex:1 !important; background:#0070f2 !important; border-radius:3px !important;
        animation:vce-wave .7s ease-in-out infinite; display:block !important; width:auto !important;
      }
      .vce-wave span:nth-child(2){animation-delay:.1s}
      .vce-wave span:nth-child(3){animation-delay:.2s}
      .vce-wave span:nth-child(4){animation-delay:.3s}
      .vce-wave span:nth-child(5){animation-delay:.4s}

      .vce-pulse { display:inline-block !important; animation:vce-pulse .9s ease-in-out infinite; }
      .vce-spin  { display:inline-block !important; animation:vce-spin 1s linear infinite; }

      /* ── Settings panel ──────────────────────────── */
      .vce-settings {
        position: fixed !important;
        bottom: 260px !important;
        right: 20px !important;
        top: auto !important;
        left: auto !important;
        width: 320px !important;
        max-width: 320px !important;
        min-width: unset !important;
        max-height: 70vh !important;
        height: auto !important;
        overflow-y: auto !important;
        background: #1a2a3a !important;
        border: 1.5px solid #0070f2 !important;
        border-radius: 14px !important;
        z-index: 2147483647 !important;
        box-shadow: 0 12px 40px rgba(0,0,0,0.6) !important;
        color: #e0eaff !important;
        font-family: "72", Arial, Helvetica, sans-serif !important;
        font-size: 13px !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        animation: vce-up .2s ease;
      }
      .vce-set-header {
        display: flex !important; justify-content: space-between !important; align-items: center !important;
        padding: 12px 14px !important; border-bottom: 1px solid rgba(255,255,255,0.1) !important;
        font-weight: 700 !important; font-size: 14px !important; position: sticky !important; top: 0 !important;
        background: #1a2a3a !important; z-index: 1 !important; color: #e0eaff !important;
        flex-direction: row !important; height: auto !important; width: auto !important;
      }
      .vce-set-close {
        background: none !important; border: none !important; color: #7fa8c8 !important; cursor: pointer !important;
        font-size: 14px !important; padding: 2px 6px !important; border-radius: 4px !important;
        height: auto !important; width: auto !important;
      }
      .vce-set-close:hover { background: rgba(255,255,255,.1) !important; color: #fff !important; }
      .vce-set-section { padding: 12px 14px !important; border-bottom: 1px solid rgba(255,255,255,0.07) !important; display:block !important; }
      .vce-set-section:last-child { border-bottom: none !important; }
      .vce-set-label { font-weight: 700 !important; font-size: 12px !important; color: #90caf9 !important; margin-bottom: 4px !important; text-transform: uppercase !important; letter-spacing: 0.05em !important; display:block !important; }
      .vce-set-hint  { font-size: 11px !important; color: #7fa8c8 !important; margin-bottom: 8px !important; line-height: 1.4 !important; display:block !important; }
      .vce-set-input {
        width: 100% !important; padding: 7px 10px !important; background: rgba(255,255,255,0.06) !important;
        border: 1px solid rgba(255,255,255,0.15) !important; border-radius: 7px !important;
        color: #e0eaff !important; font-size: 12px !important; font-family: inherit !important; outline: none !important;
        box-sizing: border-box !important; height: auto !important;
      }
      .vce-set-input:focus { border-color: #0070f2 !important; }
      .vce-set-select {
        padding: 7px 8px !important; background: rgba(255,255,255,0.06) !important;
        border: 1px solid rgba(255,255,255,0.15) !important; border-radius: 7px !important;
        color: #e0eaff !important; font-size: 12px !important; font-family: inherit !important; outline: none !important;
        height: auto !important;
      }
      .vce-set-btn {
        padding: 6px 12px !important; background: #0070f2 !important; border: none !important; border-radius: 7px !important;
        color: #fff !important; font-size: 12px !important; font-weight: 600 !important; cursor: pointer !important; font-family: inherit !important;
        white-space: nowrap !important; height: auto !important; width: auto !important;
      }
      .vce-set-btn:hover { background: #0064d9 !important; }
      .vce-alias-row {
        display: flex !important; align-items: center !important; gap: 6px !important; padding: 5px 0 !important;
        border-bottom: 1px solid rgba(255,255,255,0.05) !important; font-size: 12px !important;
        flex-direction: row !important; height: auto !important;
      }
      .vce-alias-row:last-child { border-bottom: none !important; }
      .vce-alias-phrase { color: #90caf9 !important; flex-shrink: 0 !important; }
      .vce-alias-arrow  { color: #7fa8c8 !important; flex-shrink: 0 !important; }
      .vce-alias-page   { color: #a5d6a7 !important; flex: 1 !important; }
      .vce-alias-del    {
        background: none !important; border: 1px solid rgba(239,154,154,.3) !important; color: #ef9a9a !important;
        border-radius: 4px !important; cursor: pointer !important; font-size: 10px !important; padding: 1px 5px !important;
        flex-shrink: 0 !important; height: auto !important; width: auto !important;
      }
      .vce-set-pages { display: flex !important; flex-wrap: wrap !important; gap: 5px !important; margin-top: 4px !important; flex-direction: row !important; height: auto !important; }
      .vce-set-page-chip {
        background: rgba(0,112,242,.15) !important; border: 1px solid rgba(0,112,242,.3) !important;
        border-radius: 8px !important; padding: 3px 8px !important; font-size: 11px !important; color: #b3d4ff !important;
        height: auto !important; width: auto !important;
      }

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
    this.stopWakeWordListenerPermanently();
    document.removeEventListener("keydown", this.keyHandler);
    this.panel.remove();
    this.micBtn.remove();
    this.gearBtn?.remove();
    this.settingsEl?.remove();
    this.styleEl.remove();
  }
}

function mkEl(tag: string, cls: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  return e;
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}
