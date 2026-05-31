import { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "wake_words_v1";
const DEFAULT_WORDS = ["tarang"];

export type WakeWordState = "inactive" | "requesting-mic" | "listening-wake" | "listening-command" | "processing";

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

const SR = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;

export function useWakeWord(onCommand: (transcript: string) => void) {
  const [words, setWords] = useState<string[]>(loadWords);
  const [state, setState] = useState<WakeWordState>("inactive");
  const [lastHeard, setLastHeard] = useState<string>("");
  const [supported] = useState(() => !!SR);

  const wakeRecRef    = useRef<any>(null);
  const commandRecRef = useRef<any>(null);
  const activeRef     = useRef(false);
  const wordsRef      = useRef(words);
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  wordsRef.current = words;

  const stopCommand = useCallback(() => {
    try { commandRecRef.current?.stop(); } catch {}
    commandRecRef.current = null;
  }, []);

  const startCommandListening = useCallback(() => {
    if (!SR) return;
    stopCommand();

    console.log("[WakeWord] Wake word triggered — starting command recognition.");
    setState("listening-command");
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.maxAlternatives = 3;
    commandRecRef.current = rec;

    rec.onresult = (e: any) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      console.log("[WakeWord] Command heard:", transcript);
      setLastHeard(transcript);
      setState("processing");
      onCommand(transcript.trim());
      setTimeout(() => {
        setState("listening-wake");
      }, 800);
    };

    rec.onerror = (e: any) => {
      console.warn("[WakeWord] Command recognition error:", e.error);
      setState("listening-wake");
    };

    rec.onend = () => {
      if (commandRecRef.current === rec) {
        commandRecRef.current = null;
        setState("listening-wake");
      }
    };

    try { rec.start(); } catch (err) {
      console.error("[WakeWord] Failed to start command rec:", err);
      setState("listening-wake");
    }
  }, [onCommand, stopCommand]);

  const scheduleRestart = useCallback((startFn: () => void) => {
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    // Exponential backoff: 300ms, 600ms, 1.2s, 2.4s … capped at 8s
    const delay = Math.min(300 * Math.pow(2, retryCountRef.current), 8000);
    retryCountRef.current += 1;
    console.log(`[WakeWord] Scheduling restart in ${delay}ms (attempt ${retryCountRef.current})`);
    retryTimerRef.current = setTimeout(() => {
      if (activeRef.current) startFn();
    }, delay);
  }, []);

  const startWakeListener = useCallback(() => {
    if (!SR || !activeRef.current) return;
    try { wakeRecRef.current?.abort(); } catch {}
    wakeRecRef.current = null;

    console.log("[WakeWord] Starting wake listener. Words:", wordsRef.current);

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.maxAlternatives = 5;
    wakeRecRef.current = rec;

    let gotResult = false;

    rec.onresult = (e: any) => {
      gotResult = true;
      retryCountRef.current = 0; // reset backoff on successful result
      if (commandRecRef.current) return;

      for (let i = e.resultIndex; i < e.results.length; i++) {
        for (let j = 0; j < e.results[i].length; j++) {
          const t: string = e.results[i][j].transcript.toLowerCase().trim();
          const isFinal = e.results[i].isFinal;
          console.log(`[WakeWord] Heard (${isFinal ? "FINAL" : "interim"}, alt ${j}): "${t}"`);
          setLastHeard(t);

          for (const word of wordsRef.current) {
            if (t.includes(word.toLowerCase())) {
              console.log(`[WakeWord] ✅ MATCH — "${word}" found in "${t}"`);
              gotResult = true;
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
      console.log(`[WakeWord] Recogniser ended (gotResult=${gotResult}). active:`, activeRef.current);
      if (wakeRecRef.current === rec) wakeRecRef.current = null;
      if (activeRef.current && !commandRecRef.current) {
        scheduleRestart(startWakeListener);
      }
    };

    rec.onerror = (e: any) => {
      console.warn("[WakeWord] Error:", e.error);
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        console.error("[WakeWord] Mic access denied permanently.");
        activeRef.current = false;
        setState("inactive");
        return;
      }
      if (e.error === "network") {
        console.warn("[WakeWord] Network error — Chrome speech service may be unavailable.");
      }
      if (wakeRecRef.current === rec) wakeRecRef.current = null;
      if (activeRef.current && !commandRecRef.current) {
        scheduleRestart(startWakeListener);
      }
    };

    try {
      rec.start();
      console.log("[WakeWord] Recogniser started ✓");
      setState("listening-wake");
    } catch (err) {
      console.error("[WakeWord] Failed to start:", err);
      scheduleRestart(startWakeListener);
      setState("inactive");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startCommandListening, scheduleRestart]);

  useEffect(() => {
    if (!SR) {
      console.warn("[WakeWord] SpeechRecognition not supported.");
      return;
    }

    activeRef.current = true;
    setState("requesting-mic");

    console.log("[WakeWord] Requesting microphone permission…");
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
        console.log("[WakeWord] Mic permission granted ✓ — starting.");
        retryCountRef.current = 0;
        if (activeRef.current) startWakeListener();
      })
      .catch((err) => {
        console.error("[WakeWord] Mic permission denied:", err);
        setState("inactive");
      });

    return () => {
      activeRef.current = false;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      try { wakeRecRef.current?.abort(); } catch {}
      stopCommand();
      wakeRecRef.current = null;
    };
  }, [startWakeListener, stopCommand]);

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
      const next = prev.filter((w) => w !== word);
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
