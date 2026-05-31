import { GestureEngine, VoiceCommandEngine } from "@workspace/gesture-core";
import type { VoiceCommandOptions } from "@workspace/gesture-core";
import { SapUI5Scanner } from "./SapUI5Scanner.js";

export interface GestureUI5AutoOptions {
  /** Gemini API key for voice commands. If omitted, voice is disabled. */
  geminiKey?: string;
  /** Override gesture engine sensitivity (0–1). Default 0.65 */
  sensitivity?: number;
  /** Override dwell time in ms. Default 700 */
  dwellTimeMs?: number;
  /** Show webcam preview. Default true */
  showWebcam?: boolean;
  /** Show custom cursor overlay. Default true */
  showCursor?: boolean;
  /** Audio feedback clicks/dwell. Default true */
  audioFeedback?: boolean;
  /** Virtual keyboard for text inputs. Default true */
  virtualKeyboard?: boolean;
  /**
   * Words that activate the microphone without a button click.
   * Default: ["tarang"]. Users can also change this in the settings panel.
   */
  wakeWords?: string[];
  /** Show the ⚙️ settings gear button. Default: true */
  showVoiceSettings?: boolean;
  /** Extra options forwarded to VoiceCommandEngine */
  voiceOptions?: Partial<Omit<VoiceCommandOptions, "geminiApiKey" | "pages" | "getPages" | "getCurrentPage" | "onAction">>;
  /** Called when a voice navigate action fires (use to control your router).
   *  Return true to prevent the default DOM-click navigation. */
  onVoiceNavigate?: (pageId: string, pageName: string) => boolean | void;
  /** Called when any voice action fires. Return true to prevent default. */
  onVoiceAction?: VoiceCommandOptions["onAction"];
}

/**
 * GestureUI5Auto — zero-config gesture + voice engine for SAP UI5 apps.
 *
 * Usage (plain script tag):
 *   <script src="gesture-ui5.js" data-gemini-key="AIza..."></script>
 *
 * Usage (ES module / npm):
 *   const g = new GestureUI5Auto({ geminiKey: "AIza..." });
 *   await g.init();
 *
 * The scanner reads your live DOM on every voice trigger — no page list
 * needs to be maintained.  SAP UI5 navigation happens by clicking the
 * real nav element, so UI5's router handles everything automatically.
 */
export class GestureUI5Auto {
  private engine: GestureEngine;
  private voice: VoiceCommandEngine | null = null;
  readonly scanner: SapUI5Scanner;
  private opts: GestureUI5AutoOptions;

  constructor(options: GestureUI5AutoOptions = {}) {
    this.opts = options;
    this.scanner = new SapUI5Scanner();

    this.engine = new GestureEngine({
      sensitivity: options.sensitivity ?? 0.65,
      dwellTimeMs: options.dwellTimeMs ?? 700,
      showCursor: options.showCursor ?? true,
      showWebcam: options.showWebcam ?? true,
      audioFeedback: options.audioFeedback ?? true,
      virtualKeyboard: options.virtualKeyboard ?? true,
    });

    if (options.geminiKey) {
      this.voice = new VoiceCommandEngine({
        geminiApiKey: options.geminiKey,

        // ── Dynamic page list ───────────────────────────────────
        // Called fresh at each voice trigger — reflects current DOM.
        getPages: () => this.scanner.getNavPages(),
        getCurrentPage: () => this.scanner.getCurrentPage(),

        // ── Action handler ──────────────────────────────────────
        onAction: (action) => {
          // Let the user's handler run first
          if (options.onVoiceAction?.(action)) return true;

          switch (action.type) {
            case "navigate": {
              const id = action.page ?? "";
              const pages = this.scanner.getNavPages();
              const match = pages.find(
                (p) => p.id === id || p.name.toLowerCase() === id.toLowerCase()
              );
              const name = match?.name ?? id;

              // User callback can override
              if (options.onVoiceNavigate?.(id, name)) return true;

              // Default: click the matching SAP UI5 nav element
              return this.scanner.navigate(id);
            }
            case "search":
              // Run async but return sync (VoiceCommandEngine moves on)
              this.scanner.fillSearch(action.query ?? "", 500);
              return true;
            case "click":
              return this.scanner.clickByLabel(action.label ?? "");
            default:
              return false;
          }
        },

        wakeWords: options.wakeWords ?? ["tarang"],
        showSettings: options.showVoiceSettings ?? true,
        ...options.voiceOptions,
      });
    }

    // Watch for nav DOM changes (lazy shells, permission changes)
    this.scanner.watchNavChanges(() => {
      // Nothing to do — pages are scanned fresh each trigger
      // But this keeps the observer alive so the scanner stays warm
    });
  }

  /**
   * Start the gesture engine (requests camera access).
   */
  async init(): Promise<void> {
    await this.engine.start();
  }

  /**
   * Create an instance from a <script> tag's data attributes.
   *
   *   <script src="gesture-ui5.js"
   *           data-gemini-key="AIza..."
   *           data-dwell-ms="700"
   *           data-no-webcam>
   *   </script>
   */
  static fromScriptTag(scriptEl?: HTMLOrSVGScriptElement | null): GestureUI5Auto {
    const el =
      scriptEl ??
      (document.currentScript as HTMLScriptElement | null) ??
      document.querySelector<HTMLScriptElement>("script[data-gemini-key]");

    const get = (attr: string) => el?.getAttribute(attr) ?? undefined;

    return new GestureUI5Auto({
      geminiKey: get("data-gemini-key"),
      dwellTimeMs: get("data-dwell-ms") ? Number(get("data-dwell-ms")) : undefined,
      sensitivity: get("data-sensitivity") ? Number(get("data-sensitivity")) : undefined,
      showWebcam: el?.hasAttribute("data-no-webcam") ? false : true,
      showCursor: el?.hasAttribute("data-no-cursor") ? false : true,
      audioFeedback: el?.hasAttribute("data-no-audio") ? false : true,
      virtualKeyboard: el?.hasAttribute("data-no-keyboard") ? false : true,
    });
  }

  getEngine(): GestureEngine {
    return this.engine;
  }

  getVoice(): VoiceCommandEngine | null {
    return this.voice;
  }

  destroy(): void {
    this.engine.destroy();
    this.voice?.destroy();
    this.scanner.stopWatching();
  }
}
