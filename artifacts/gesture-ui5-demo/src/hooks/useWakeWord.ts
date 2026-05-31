import { useState, useEffect, useRef, useCallback } from "react";

const STORAGE_KEY = "wake_words_v1";
const DEFAULT_WORDS = ["tarang"];

export type WakeWordState = "inactive" | "listening-wake" | "listening-command" | "processing";

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
  const [supported] = useState(() => !!SR);

  const wakeRecRef    = useRef<any>(null);
  const commandRecRef = useRef<any>(null);
  const activeRef     = useRef(false);
  const wordsRef      = useRef(words);
  wordsRef.current = words;

  const stopCommand = useCallback(() => {
    try { commandRecRef.current?.stop(); } catch {}
    commandRecRef.current = null;
  }, []);

  const startCommandListening = useCallback(() => {
    if (!SR) return;
    stopCommand();

    setState("listening-command");
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.maxAlternatives = 3;
    commandRecRef.current = rec;

    rec.onresult = (e: any) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      setState("processing");
      onCommand(transcript.trim());
      setTimeout(() => {
        setState("listening-wake");
      }, 800);
    };

    rec.onerror = () => setState("listening-wake");
    rec.onend   = () => {
      if (commandRecRef.current === rec) {
        commandRecRef.current = null;
        setState("listening-wake");
      }
    };

    try { rec.start(); } catch { setState("listening-wake"); }
  }, [onCommand, stopCommand]);

  const startWakeListener = useCallback(() => {
    if (!SR || !activeRef.current) return;
    try { wakeRecRef.current?.abort(); } catch {}

    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.maxAlternatives = 3;
    wakeRecRef.current = rec;

    rec.onresult = (e: any) => {
      if (commandRecRef.current) return;
      for (let i = e.resultIndex; i < e.results.length; i++) {
        for (let j = 0; j < e.results[i].length; j++) {
          const t: string = e.results[i][j].transcript.toLowerCase().trim();
          for (const word of wordsRef.current) {
            if (t.includes(word.toLowerCase())) {
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
      if (wakeRecRef.current === rec && activeRef.current) {
        setTimeout(startWakeListener, 300);
      }
    };

    rec.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        activeRef.current = false;
        setState("inactive");
        return;
      }
      if (wakeRecRef.current === rec && activeRef.current) {
        setTimeout(startWakeListener, 1500);
      }
    };

    try {
      rec.start();
      setState("listening-wake");
    } catch {
      setState("inactive");
    }
  }, [startCommandListening]);

  useEffect(() => {
    if (!SR) return;
    activeRef.current = true;
    startWakeListener();
    return () => {
      activeRef.current = false;
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

  return { words, state, supported, addWord, removeWord, resetWords };
}
