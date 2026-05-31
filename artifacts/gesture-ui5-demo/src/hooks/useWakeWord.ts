import { useState, useRef, useCallback } from "react";

const STORAGE_KEY = "wake_words_v1";
const DEFAULT_WORDS = ["tarang"];

export type WakeWordState =
  | "inactive"
  | "listening-wake"
  | "listening-command"
  | "processing";

function loadWords(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...DEFAULT_WORDS];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) && parsed.length ? parsed : [...DEFAULT_WORDS];
  } catch {
    return [...DEFAULT_WORDS];
  }
}

function saveWords(words: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
}

const SR =
  (window as any).SpeechRecognition ??
  (window as any).webkitSpeechRecognition;

export function useWakeWord(onCommand: (transcript: string) => void) {
  const [words, setWords]         = useState<string[]>(loadWords);
  const [state, setState]         = useState<WakeWordState>("inactive");
  const [lastHeard, setLastHeard] = useState("");
  const [supported]               = useState(() => !!SR);

  const wordsRef       = useRef<string[]>(words);
  const onCommandRef   = useRef(onCommand);
  const wakeRecRef     = useRef<any>(null);
  const commandRecRef  = useRef<any>(null);
  const activeRef      = useRef(false);
  const retryTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef  = useRef(0);

  wordsRef.current    = words;
  onCommandRef.current = onCommand;

  // ── command listener ────────────────────────────────────────────────
  const startCommandListening = useRef(() => {
    if (!SR) return;
    try { commandRecRef.current?.stop(); } catch {}
    commandRecRef.current = null;

    setState("listening-command");
    const rec = new SR();
    rec.continuous      = false;
    rec.interimResults  = false;
    rec.lang            = "en-US";
    rec.maxAlternatives = 3;
    commandRecRef.current = rec;

    rec.onresult = (e: any) => {
      const t: string = e.results[0]?.[0]?.transcript ?? "";
      console.log("[WakeWord] Command heard:", t);
      setLastHeard(t);
      setState("processing");
      onCommandRef.current(t.trim());
      setTimeout(() => setState("listening-wake"), 800);
    };
    rec.onerror = () => {
      commandRecRef.current = null;
      setState("listening-wake");
    };
    rec.onend = () => {
      if (commandRecRef.current === rec) {
        commandRecRef.current = null;
        setState("listening-wake");
      }
    };
    try { rec.start(); } catch { setState("listening-wake"); }
  }).current;

  // ── wake listener ────────────────────────────────────────────────────
  const startWakeListener = useRef(function start() {
    if (!SR || !activeRef.current) return;
    try { wakeRecRef.current?.abort(); } catch {}
    wakeRecRef.current = null;

    console.log("[WakeWord] Starting. Words:", wordsRef.current);
    const rec = new SR();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.lang            = "en-US";
    rec.maxAlternatives = 5;
    wakeRecRef.current  = rec;

    rec.onresult = (e: any) => {
      retryCountRef.current = 0;
      if (commandRecRef.current) return;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        for (let j = 0; j < e.results[i].length; j++) {
          const t: string = e.results[i][j].transcript.toLowerCase().trim();
          console.log(`[WakeWord] Heard: "${t}"`);
          setLastHeard(t);
          for (const w of wordsRef.current) {
            if (t.includes(w.toLowerCase())) {
              console.log(`[WakeWord] ✅ Match "${w}"`);
              try { rec.stop(); } catch {}
              wakeRecRef.current = null;
              startCommandListening();
              return;
            }
          }
        }
      }
    };

    rec.onend = () => {
      if (wakeRecRef.current === rec) wakeRecRef.current = null;
      if (!activeRef.current || commandRecRef.current) return;
      const delay = Math.min(500 * Math.pow(2, retryCountRef.current), 10000);
      retryCountRef.current = Math.min(retryCountRef.current + 1, 6);
      console.log(`[WakeWord] Ended, retry in ${delay}ms`);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(start, delay);
    };

    rec.onerror = (e: any) => {
      console.warn("[WakeWord] Error:", e.error);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        activeRef.current = false;
        setState("inactive");
        return;
      }
      if (wakeRecRef.current === rec) wakeRecRef.current = null;
      if (!activeRef.current || commandRecRef.current) return;
      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);
      retryCountRef.current = Math.min(retryCountRef.current + 1, 6);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(start, delay);
    };

    try {
      rec.start();
      setState("listening-wake");
    } catch (err) {
      console.error("[WakeWord] Failed to start:", err);
      setState("inactive");
    }
  }).current;

  // ── called externally once camera/gesture engine is ready ────────────
  const start = useCallback(() => {
    if (!SR || activeRef.current) return;
    console.log("[WakeWord] start() called.");
    activeRef.current = true;
    retryCountRef.current = 0;
    startWakeListener();
  }, [startWakeListener]);

  const stop = useCallback(() => {
    activeRef.current = false;
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    try { wakeRecRef.current?.abort(); } catch {}
    try { commandRecRef.current?.stop(); } catch {}
    wakeRecRef.current = null;
    commandRecRef.current = null;
    setState("inactive");
  }, []);

  const addWord = useCallback((word: string) => {
    const w = word.trim().toLowerCase();
    if (!w) return;
    setWords((prev) => {
      if (prev.includes(w)) return prev;
      const next = [...prev, w];
      saveWords(next);
      return next;
    });
  }, []);

  const removeWord = useCallback((word: string) => {
    setWords((prev) => {
      const next = prev.filter((ww) => ww !== word);
      const final = next.length ? next : [...DEFAULT_WORDS];
      saveWords(final);
      return final;
    });
  }, []);

  return { words, state, lastHeard, supported, start, stop, addWord, removeWord };
}
