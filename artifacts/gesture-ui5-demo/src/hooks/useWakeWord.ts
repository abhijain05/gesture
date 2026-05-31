import { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "wake_words_v1";
const DEFAULT_WORDS = ["tarang"];

export type WakeWordState =
  | "inactive"
  | "requesting-mic"
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
  const [words, setWords]       = useState<string[]>(loadWords);
  const [state, setState]       = useState<WakeWordState>("inactive");
  const [lastHeard, setLastHeard] = useState("");
  const [supported]             = useState(() => !!SR);

  // All mutable state lives in refs so callbacks never go stale
  const wordsRef        = useRef<string[]>(words);
  const onCommandRef    = useRef(onCommand);
  const wakeRecRef      = useRef<any>(null);
  const commandRecRef   = useRef<any>(null);
  const activeRef       = useRef(false);
  const retryTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryCountRef   = useRef(0);
  const initializedRef  = useRef(false);

  // Keep refs in sync with latest values
  wordsRef.current   = words;
  onCommandRef.current = onCommand;

  // ── Stable internal helpers (defined once, read from refs) ──────────

  const startCommandListening = useRef(() => {
    if (!SR) return;
    try { commandRecRef.current?.stop(); } catch {}
    commandRecRef.current = null;

    console.log("[WakeWord] Wake triggered — listening for command.");
    setState("listening-command");

    const rec = new SR();
    rec.continuous      = false;
    rec.interimResults  = false;
    rec.lang            = "en-US";
    rec.maxAlternatives = 3;
    commandRecRef.current = rec;

    rec.onresult = (e: any) => {
      const transcript: string = e.results[0]?.[0]?.transcript ?? "";
      console.log("[WakeWord] Command heard:", transcript);
      setLastHeard(transcript);
      setState("processing");
      onCommandRef.current(transcript.trim());
      setTimeout(() => setState("listening-wake"), 800);
    };

    rec.onerror = (e: any) => {
      console.warn("[WakeWord] Command rec error:", e.error);
      setState("listening-wake");
      commandRecRef.current = null;
    };

    rec.onend = () => {
      if (commandRecRef.current === rec) {
        commandRecRef.current = null;
        setState("listening-wake");
      }
    };

    try {
      rec.start();
    } catch (err) {
      console.error("[WakeWord] Failed to start command rec:", err);
      setState("listening-wake");
    }
  }).current;

  const startWakeListener = useRef(function start() {
    if (!SR || !activeRef.current) return;
    try { wakeRecRef.current?.abort(); } catch {}
    wakeRecRef.current = null;

    console.log("[WakeWord] Starting wake listener. Words:", wordsRef.current);

    const rec = new SR();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.lang            = "en-US";
    rec.maxAlternatives = 5;
    wakeRecRef.current  = rec;

    let gotResult = false;

    rec.onresult = (e: any) => {
      gotResult = true;
      retryCountRef.current = 0;
      if (commandRecRef.current) return;

      for (let i = e.resultIndex; i < e.results.length; i++) {
        for (let j = 0; j < e.results[i].length; j++) {
          const t: string = e.results[i][j].transcript.toLowerCase().trim();
          const isFinal: boolean = e.results[i].isFinal;
          console.log(`[WakeWord] Heard (${isFinal ? "FINAL" : "interim"}, alt ${j}): "${t}"`);
          setLastHeard(t);

          for (const word of wordsRef.current) {
            if (t.includes(word.toLowerCase())) {
              console.log(`[WakeWord] ✅ Match "${word}" in "${t}"`);
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
      console.log(`[WakeWord] Wake rec ended. gotResult=${gotResult} active=${activeRef.current}`);
      if (wakeRecRef.current === rec) wakeRecRef.current = null;
      if (!activeRef.current || commandRecRef.current) return;

      const delay = Math.min(300 * Math.pow(2, retryCountRef.current), 8000);
      retryCountRef.current += 1;
      console.log(`[WakeWord] Retry in ${delay}ms (attempt ${retryCountRef.current})`);
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(start, delay);
    };

    rec.onerror = (e: any) => {
      console.warn("[WakeWord] Error:", e.error);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        console.error("[WakeWord] Mic denied — disabling.");
        activeRef.current = false;
        setState("inactive");
        return;
      }
      if (wakeRecRef.current === rec) wakeRecRef.current = null;
      if (!activeRef.current || commandRecRef.current) return;

      const delay = Math.min(1500 * Math.pow(2, retryCountRef.current), 10000);
      retryCountRef.current += 1;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(start, delay);
    };

    try {
      rec.start();
      console.log("[WakeWord] Recogniser started ✓");
      setState("listening-wake");
    } catch (err) {
      console.error("[WakeWord] Failed to start:", err);
      setState("inactive");
    }
  }).current;

  // ── One-time initialization ──────────────────────────────────────────
  useEffect(() => {
    if (!SR || initializedRef.current) return;
    initializedRef.current = true;
    activeRef.current = true;
    setState("requesting-mic");

    console.log("[WakeWord] Requesting mic permission (once)…");
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
        console.log("[WakeWord] Mic granted ✓");
        retryCountRef.current = 0;
        if (activeRef.current) startWakeListener();
      })
      .catch((err) => {
        console.error("[WakeWord] Mic denied:", err);
        // Still try SpeechRecognition — it may prompt on its own
        if (activeRef.current) startWakeListener();
      });

    return () => {
      activeRef.current = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      try { wakeRecRef.current?.abort(); } catch {}
      try { commandRecRef.current?.stop(); } catch {}
      wakeRecRef.current = null;
      commandRecRef.current = null;
    };
  }, []); // empty deps — runs exactly once

  // ── Public API ───────────────────────────────────────────────────────
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

  const resetWords = useCallback(() => {
    saveWords([...DEFAULT_WORDS]);
    setWords([...DEFAULT_WORDS]);
  }, []);

  return { words, state, lastHeard, supported, addWord, removeWord, resetWords };
}
