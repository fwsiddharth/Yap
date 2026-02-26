"use client";

import { Button } from "@heroui/react";
import { AnimatePresence, motion } from "motion/react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type Entry = {
  id: string;
  text: string;
  createdAt: string;
};

type VoiceClip = {
  id: string;
  createdAt: string;
  durationMs: number;
  audioDataUrl: string;
};

const STORAGE_KEY = "sid-journal-entries";
const SETTINGS_KEY = "sid-journal-settings";
const VOICE_STORAGE_KEY = "sid-journal-voice-clips";
const RANDOM_FONTS = [
  { name: "Inter", family: "Inter, var(--font-geist-sans), system-ui, sans-serif" },
  { name: "JetBrains Mono", family: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace" },
  { name: "Roboto", family: "Roboto, Arial, sans-serif" },
  { name: "Open Sans", family: "Open Sans, Arial, sans-serif" },
  { name: "Montserrat", family: "Montserrat, Arial, sans-serif" },
  { name: "Poppins", family: "Poppins, Arial, sans-serif" },
  { name: "Source Sans 3", family: "Source Sans 3, Source Sans Pro, Arial, sans-serif" },
  { name: "Merriweather", family: "Merriweather, Georgia, serif" },
  { name: "Lora", family: "Lora, Georgia, serif" },
  { name: "Playfair Display", family: "Playfair Display, Georgia, serif" },
  { name: "Noto Sans", family: "Noto Sans, Arial, sans-serif" },
  { name: "Segoe UI", family: "Segoe UI, Tahoma, Geneva, sans-serif" },
  { name: "SF Pro", family: "SF Pro Text, SF Pro Display, -apple-system, system-ui, sans-serif" },
  { name: "iA Writer Mono", family: "iA Writer Mono, JetBrains Mono, ui-monospace, monospace" },
  { name: "Atkinson Hyperlegible", family: "Atkinson Hyperlegible, Arial, sans-serif" },
  { name: "Aptos", family: "Aptos, Calibri, Segoe UI, sans-serif" },
  { name: "Space Grotesk", family: "var(--font-space-grotesk), system-ui, sans-serif" },
  { name: "Geist", family: "var(--font-geist-sans), system-ui, sans-serif" },
  { name: "Instrument Serif", family: "var(--font-instrument-serif), Georgia, serif" },
  { name: "Bricolage", family: "var(--font-bricolage), system-ui, sans-serif" },
];

type AppSettings = {
  fontSize: number;
  fontOption: "Lato" | "Arial" | "System" | "Serif" | "Random";
  randomFontFamily: string;
  randomFontName: string;
  mode: "Chat" | "Voice";
  backspaceOn: boolean;
  darkMode: boolean;
  timerSeconds: number;
  timerRunning: boolean;
};

const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 18,
  fontOption: "Lato",
  randomFontFamily: "Lato, Manrope, sans-serif",
  randomFontName: "",
  mode: "Chat",
  backspaceOn: true,
  darkMode: false,
  timerSeconds: 15 * 60,
  timerRunning: false,
};

export default function Home() {
  const [text, setText] = useState("");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [voiceClips, setVoiceClips] = useState<VoiceClip[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [entriesLoaded, setEntriesLoaded] = useState(false);
  const [voiceLoaded, setVoiceLoaded] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [randomIndex, setRandomIndex] = useState(0);
  const [randomCycleOffset, setRandomCycleOffset] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [deletingEntryId, setDeletingEntryId] = useState<string | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [voiceError, setVoiceError] = useState("");
  const editorRef = useRef<HTMLTextAreaElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordingStartRef = useRef<number>(0);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setEntriesLoaded(true);
      return;
    }
    try {
      setEntries(JSON.parse(raw) as Entry[]);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setEntriesLoaded(true);
    }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) {
      setSettingsLoaded(true);
      return;
    }
    try {
      setSettings((prev) => ({
        ...prev,
        ...(JSON.parse(raw) as Partial<AppSettings>),
        mode: "Chat",
      }));
    } catch {
      localStorage.removeItem(SETTINGS_KEY);
    } finally {
      setSettingsLoaded(true);
    }
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(VOICE_STORAGE_KEY);
    if (!raw) {
      setVoiceLoaded(true);
      return;
    }
    try {
      setVoiceClips(JSON.parse(raw) as VoiceClip[]);
    } catch {
      localStorage.removeItem(VOICE_STORAGE_KEY);
    } finally {
      setVoiceLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!entriesLoaded) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries, entriesLoaded]);

  useEffect(() => {
    if (!settingsLoaded) return;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings, settingsLoaded]);

  useEffect(() => {
    if (!voiceLoaded) return;
    localStorage.setItem(VOICE_STORAGE_KEY, JSON.stringify(voiceClips));
  }, [voiceClips, voiceLoaded]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  useEffect(() => {
    if (!settings.timerRunning) return;
    const tick = window.setInterval(() => {
      setSettings((prev) => {
        if (!prev.timerRunning) return prev;
        if (prev.timerSeconds <= 1) {
          return { ...prev, timerSeconds: 0, timerRunning: false };
        }
        return { ...prev, timerSeconds: prev.timerSeconds - 1 };
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, [settings.timerRunning]);

  useEffect(() => {
    return () => {
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 639px)");
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      return;
    }
    await document.exitFullscreen();
  };

  const keepWritingFocusOnControlClick = (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    if (!target.closest("button")) return;
    event.preventDefault();
    requestAnimationFrame(() => editorRef.current?.focus());
  };

  const timerLabel = useMemo(() => {
    const minutes = Math.floor(settings.timerSeconds / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (settings.timerSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [settings.timerSeconds]);

  const editorFontFamily = useMemo(() => {
    if (settings.fontOption === "System") return "system-ui, -apple-system, Segoe UI, sans-serif";
    if (settings.fontOption === "Arial") return "Arial, Helvetica, sans-serif";
    if (settings.fontOption === "Serif") return "Georgia, 'Times New Roman', serif";
    if (settings.fontOption === "Lato") return "Lato, Manrope, sans-serif";
    return settings.randomFontFamily;
  }, [settings.fontOption, settings.randomFontFamily]);

  const randomizeFont = () => {
    const fontCount = RANDOM_FONTS.length;
    const pickIndex = (randomCycleOffset + randomIndex * 7) % fontCount;
    const pick = RANDOM_FONTS[pickIndex];
    const nextIndex = randomIndex + 1;
    if (nextIndex >= fontCount) {
      setRandomIndex(0);
      setRandomCycleOffset((prev) => (prev + 3) % fontCount);
    } else {
      setRandomIndex(nextIndex);
    }
    setSettings((prev) => ({
      ...prev,
      fontOption: "Random",
      randomFontFamily: pick.family,
      randomFontName: pick.name,
    }));
  };

  const handleFontOption = (font: "Lato" | "Arial" | "System" | "Serif" | "Random") => {
    if (font === "Random") {
      randomizeFont();
      return;
    }
    setSettings((prev) => ({
      ...prev,
      fontOption: font,
      randomFontName: "",
    }));
    setRandomIndex(0);
    setRandomCycleOffset((prev) => (prev + 5) % RANDOM_FONTS.length);
  };

  const toggleFontSize = () => {
    const sizes = [16, 18, 20, 22, 26, 32, 40, 52];
    const currentIndex = sizes.indexOf(settings.fontSize);
    const nextSize = sizes[(currentIndex + 1) % sizes.length];
    setSettings((prev) => ({ ...prev, fontSize: nextSize }));
  };

  const startNewEntry = () => {
    const trimmed = text.trim();
    if (trimmed) {
      if (activeEntryId) {
        setEntries((prev) =>
          prev.map((entry) => (entry.id === activeEntryId ? { ...entry, text: trimmed } : entry)),
        );
      } else {
        const nextEntry = {
          id: crypto.randomUUID(),
          text: trimmed,
          createdAt: new Date().toISOString(),
        };
        setEntries((prev) => [nextEntry, ...prev]);
      }
    }
    setText("");
    setActiveEntryId(null);
  };

  const deleteEntry = (entryId: string) => {
    setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    if (activeEntryId === entryId) {
      setActiveEntryId(null);
      setText("");
    }
  };

  const deleteVoiceClip = (clipId: string) => {
    setVoiceClips((prev) => prev.filter((clip) => clip.id !== clipId));
  };

  const startVoiceRecording = async () => {
    setVoiceError("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setVoiceError("voice not supported");
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recordingStartRef.current = Date.now();

      const chunks: Blob[] = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const audioDataUrl = typeof reader.result === "string" ? reader.result : "";
          if (!audioDataUrl) return;
          const clip: VoiceClip = {
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            durationMs: Math.max(500, Date.now() - recordingStartRef.current),
            audioDataUrl,
          };
          setVoiceClips((prev) => [clip, ...prev]);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
      };

      recorder.start();
      setIsRecordingVoice(true);
      return true;
    } catch {
      setVoiceError("mic permission needed");
      return false;
    }
  };

  const stopVoiceRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") return;
    recorder.stop();
    setIsRecordingVoice(false);
  };

  const toggleMode = async () => {
    if (settings.mode === "Chat") {
      setSettings((prev) => ({ ...prev, mode: "Voice" }));
      return;
    }

    if (isRecordingVoice) stopVoiceRecording();
    setSettings((prev) => ({ ...prev, mode: "Chat" }));
  };

  const requestDeleteEntry = (entryId: string) => {
    if (deletingEntryId) return;
    setDeletingEntryId(entryId);
    window.setTimeout(() => {
      deleteEntry(entryId);
      setDeletingEntryId(null);
    }, 780);
  };

  useEffect(() => {
    if (!entriesLoaded) return;
    const trimmed = text.trim();
    if (!trimmed) return;

    const timeout = window.setTimeout(() => {
      if (activeEntryId) {
        setEntries((prev) =>
          prev.map((entry) => {
            if (entry.id !== activeEntryId) return entry;
            if (entry.text === trimmed) return entry;
            return { ...entry, text: trimmed };
          }),
        );
        return;
      }

      const nextEntry = {
        id: crypto.randomUUID(),
        text: trimmed,
        createdAt: new Date().toISOString(),
      };
      setEntries((prev) => [nextEntry, ...prev]);
      setActiveEntryId(nextEntry.id);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [text, activeEntryId, entriesLoaded]);

  const toggleTimer = () => {
    setSettings((prev) => {
      const reset = prev.timerSeconds === 0;
      return {
        ...prev,
        timerSeconds: reset ? 15 * 60 : prev.timerSeconds,
        timerRunning: !prev.timerRunning,
      };
    });
  };

  const resetTimer = () => {
    setSettings((prev) => ({
      ...prev,
      timerSeconds: 15 * 60,
      timerRunning: false,
    }));
  };

  const historyGroups = useMemo(() => {
    const keyFmt = new Intl.DateTimeFormat("en-CA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const labelFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
    const groups = new Map<string, { label: string; items: Entry[] }>();

    for (const entry of entries) {
      const created = new Date(entry.createdAt);
      const key = keyFmt.format(created);
      if (!groups.has(key)) {
        groups.set(key, { label: labelFmt.format(created), items: [] });
      }
      groups.get(key)?.items.push(entry);
    }

    return Array.from(groups.values());
  }, [entries]);

  const formatVoiceDuration = (durationMs: number) => {
    const totalSeconds = Math.max(1, Math.round(durationMs / 1000));
    const m = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (totalSeconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };
  const lastVoiceClip = voiceClips[0];

  const pageBg = settings.darkMode ? "bg-[#121212]" : "bg-[#e9e9e6]";
  const panelBg = settings.darkMode ? "bg-[#1a1a1a]" : "bg-[#f3f3f0]";
  const footerBg = settings.darkMode ? "bg-[#202020]/92" : "bg-[#ecece8]/92";
  const primaryText = settings.darkMode ? "text-white" : "text-black";
  const mutedText = settings.darkMode ? "text-white/65" : "text-black/65";
  const compactControls = historyOpen;
  const textareaTone = settings.darkMode
    ? "text-white/90 placeholder:text-white/35 placeholder:font-normal placeholder:text-[0.72em]"
    : "text-black/90 placeholder:text-black/35 placeholder:font-normal placeholder:text-[0.72em]";
  const footerHeight = isMobile ? 98 : compactControls ? 44 : 52;
  const controlClass = `${compactControls ? "h-6 min-h-6 px-1 text-[11px]" : "h-7 min-h-7 px-1.5 text-[12px]"} min-w-0 rounded-none bg-transparent py-1 leading-none font-normal tracking-normal shadow-none opacity-75 transition-opacity data-[hover=true]:bg-transparent data-[hover=true]:opacity-100 data-[pressed=true]:scale-100 font-[family-name:var(--font-manrope)] ${mutedText}`;
  const dotClass = `${compactControls ? "mx-0.5 text-[11px]" : "mx-1 text-[12px]"} inline-flex items-center leading-none ${
    settings.darkMode ? "text-white/35" : "text-black/35"
  }`;
  const splitDotClass = `${compactControls ? "mx-1 text-[11px]" : "mx-1.5 text-[12px]"} inline-flex items-center leading-none ${
    settings.darkMode ? "text-white/30" : "text-black/30"
  }`;
  const editorLineHeight = Math.max(1.3, settings.fontSize / 22);
  const gutterClass = "px-6 sm:px-8";
  const sectionRightClass = historyOpen ? "right-0 sm:right-[272px]" : "right-0";
  const footerRightClass = historyOpen ? "right-0 sm:right-[272px]" : "right-0";

  return (
    <div className={`min-h-screen ${pageBg} ${primaryText} flex items-center justify-center p-0 sm:p-6`}>
        <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className={`relative h-[100dvh] w-full max-w-6xl overflow-hidden rounded-none border-0 sm:h-[70vh] sm:rounded-2xl sm:border ${panelBg} ${
          settings.darkMode ? "sm:border-white/10" : "sm:border-black/10"
        }`}
        onMouseDown={(event) => {
          if (settings.mode !== "Chat") return;
          const target = event.target as HTMLElement;
          if (target.closest("footer") || target.closest("aside")) return;
          editorRef.current?.focus();
        }}
      >
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className={`absolute left-0 top-0 pt-2 sm:pt-3 ${gutterClass} ${sectionRightClass}`}
          style={{ bottom: `${footerHeight}px` }}
        >
          {settings.mode === "Chat" ? (
            <textarea
              ref={editorRef}
              autoFocus
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Start with one sentence."
              onKeyDown={(event) => {
                if (!settings.backspaceOn && event.key === "Backspace") {
                  event.preventDefault();
                }
              }}
              style={{
                fontFamily: editorFontFamily,
                fontSize: `${settings.fontSize}px`,
                lineHeight: editorLineHeight,
                paddingTop: "4px",
              }}
              className={`h-full w-full resize-none bg-transparent p-0 outline-none ${textareaTone}`}
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center">
              <div
                className={`w-full max-w-2xl rounded-2xl border px-5 py-8 sm:px-8 sm:py-10 ${
                  settings.darkMode ? "border-white/10 bg-white/[0.02]" : "border-black/10 bg-black/[0.015]"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className={`font-[family-name:var(--font-manrope)] text-xs tracking-[0.18em] ${settings.darkMode ? "text-white/45" : "text-black/42"}`}>
                    VOICE JOURNAL
                  </p>
                  <p className={`font-[family-name:var(--font-manrope)] text-xs ${settings.darkMode ? "text-white/50" : "text-black/45"}`}>
                    {voiceClips.length} saved
                  </p>
                </div>

                <div className="mt-8 flex flex-col items-center text-center">
                  <motion.div
                    animate={isRecordingVoice ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                    transition={isRecordingVoice ? { duration: 1.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" } : { duration: 0.2 }}
                    className={`relative flex h-24 w-24 items-center justify-center rounded-full border ${
                      settings.darkMode ? "border-white/20 bg-white/[0.04]" : "border-black/15 bg-black/[0.03]"
                    }`}
                  >
                    <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect x="9" y="3.5" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M6.5 11.5a5.5 5.5 0 1 0 11 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M12 17v3.5M9.5 20.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    {isRecordingVoice ? (
                      <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-red-500" />
                    ) : null}
                  </motion.div>

                  <p className={`mt-5 font-[family-name:var(--font-manrope)] text-sm ${settings.darkMode ? "text-white/65" : "text-black/62"}`}>
                    {isRecordingVoice ? "recording now..." : "ready to capture your voice note"}
                  </p>
                  {lastVoiceClip ? (
                    <p className={`mt-1 font-[family-name:var(--font-manrope)] text-xs ${settings.darkMode ? "text-white/45" : "text-black/45"}`}>
                      last clip: {formatVoiceDuration(lastVoiceClip.durationMs)}
                    </p>
                  ) : null}
                </div>

                <div className="mt-8 flex items-center justify-center gap-3">
                  <Button
                    size="sm"
                    radius="full"
                    variant="light"
                    className={`px-4 font-[family-name:var(--font-manrope)] ${isRecordingVoice ? (settings.darkMode ? "text-white/45" : "text-black/45") : ""}`}
                    onPress={startVoiceRecording}
                    isDisabled={isRecordingVoice}
                  >
                    start
                  </Button>
                  <Button
                    size="sm"
                    radius="full"
                    variant="light"
                    className={`px-4 font-[family-name:var(--font-manrope)] ${isRecordingVoice ? (settings.darkMode ? "text-white/95" : "text-black/90") : ""}`}
                    onPress={stopVoiceRecording}
                    isDisabled={!isRecordingVoice}
                  >
                    stop
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.section>

        <AnimatePresence>
          {historyOpen ? (
            <motion.aside
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={`absolute right-0 top-0 w-full sm:w-[272px] ${
                settings.darkMode ? "bg-[#161616] border-l border-white/15" : "bg-[#e6e6e1] border-l border-black/15"
              }`}
              style={{ bottom: isMobile ? `${footerHeight}px` : "0px" }}
              onMouseDownCapture={keepWritingFocusOnControlClick}
            >
              <div className="px-5 py-4">
                <div className="flex items-center gap-1.5">
                  <p
                    className={`text-[14px] font-semibold font-[family-name:var(--font-manrope)] ${
                      settings.darkMode ? "text-white/82" : "text-black/78"
                    }`}
                  >
                    History
                  </p>
                  <span className={`text-[11px] ${settings.darkMode ? "text-white/35" : "text-black/35"}`}>↗</span>
                </div>
              </div>

              <div className="relative h-[calc(100%-70px)] overflow-y-auto pb-14">
                {historyGroups.length === 0 ? (
                  <div className="px-5 py-4">
                    <p
                      className={`text-[12px] font-[family-name:var(--font-manrope)] ${
                        settings.darkMode ? "text-white/50" : "text-black/48"
                      }`}
                    >
                      no entries yet.
                    </p>
                  </div>
                ) : (
                  historyGroups.map((group) => (
                    <div key={group.label} className="pb-1">
                      <div
                        className={`mt-4 mb-2 px-5 text-[11px] uppercase tracking-[0.08em] font-[family-name:var(--font-manrope)] ${
                          settings.darkMode ? "text-white/48" : "text-black/45"
                        }`}
                      >
                        {group.label}
                      </div>
                      {group.items.map((entry) => {
                        const isDeleting = deletingEntryId === entry.id;
                        return (
                        <motion.div
                          key={entry.id}
                          layout
                          animate={isDeleting ? { opacity: 0.55, scale: 0.985 } : { opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className={`w-full min-h-14 px-5 py-3 ${
                            activeEntryId === entry.id
                              ? settings.darkMode
                                ? "bg-white/[0.05]"
                                : "bg-black/[0.04]"
                              : "bg-transparent"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <button
                              type="button"
                              className="min-w-0 flex-1 text-left"
                              onClick={() => {
                                setText(entry.text);
                                setActiveEntryId(entry.id);
                              }}
                            >
                              <p
                                className={`truncate text-[13px] font-normal font-[family-name:var(--font-manrope)] ${
                                  settings.darkMode ? "text-white/80" : "text-black/76"
                                }`}
                              >
                                {entry.text}
                              </p>
                              <p
                                className={`mt-0.5 text-[11px] font-[family-name:var(--font-manrope)] ${
                                  settings.darkMode ? "text-white/48" : "text-black/46"
                                }`}
                              >
                                {group.label}
                              </p>
                            </button>
                            <button
                              type="button"
                              aria-label="Delete entry"
                              className={`inline-flex h-11 w-11 items-center justify-center ${
                                settings.darkMode ? "text-white/45" : "text-black/45"
                              }`}
                              onClick={() => requestDeleteEntry(entry.id)}
                              disabled={isDeleting}
                            >
                              <span className="relative inline-flex h-8 w-8 -scale-x-100 items-center justify-center">
                              <motion.svg
                                viewBox="0 0 16 16"
                                className="h-8 w-8"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <motion.g
                                  animate={isDeleting ? { y: [0, 0.3, 0] } : { y: 0 }}
                                  transition={{ duration: 0.46, ease: "easeInOut" }}
                                >
                                  <path
                                    d="M4 5.5h8l-.7 7.2c-.08.78-.73 1.3-1.5 1.3H6.2c-.77 0-1.42-.52-1.5-1.3L4 5.5Z"
                                    stroke="currentColor"
                                    strokeWidth="1"
                                    strokeLinejoin="round"
                                  />
                                  <path d="M5.9 7.3v5.1M8 7.3v5.1M10.1 7.3v5.1" stroke="currentColor" strokeWidth="0.9" />
                                  <rect x="6.4" y="13.8" width="3.2" height="0.7" rx="0.35" fill="currentColor" opacity="0.55" />
                                </motion.g>
                                <motion.g
                                  animate={isDeleting ? { rotate: [0, -32, -32, 0], x: [0, -0.1, -0.1, 0] } : { rotate: 0, x: 0 }}
                                  transition={{ duration: 0.62, times: [0, 0.3, 0.72, 1], ease: "easeInOut" }}
                                  style={{ originX: "5px", originY: "4.8px" }}
                                >
                                  <rect x="3.4" y="4.2" width="9.2" height="1.2" rx="0.6" fill="currentColor" />
                                  <rect x="6.2" y="3" width="3.6" height="1" rx="0.5" stroke="currentColor" strokeWidth="0.9" />
                                </motion.g>
                              </motion.svg>
                              <motion.span
                                className="absolute right-[1.4px] top-[6px] h-[5px] w-[4px] rounded-[0.8px] border border-current bg-current/10"
                                animate={
                                  isDeleting
                                    ? {
                                        x: [0, -2.8, -6.2, -8.4],
                                        y: [0, 0.9, 2.6, 6.3],
                                        rotate: [0, -8, -16, -24],
                                        scale: [1, 0.95, 0.86, 0.7],
                                        opacity: [0.95, 1, 0.92, 0],
                                      }
                                    : { x: 0, y: 0, rotate: 0, scale: 1, opacity: 0 }
                                }
                                transition={{ duration: 0.58, delay: 0.1, ease: "easeIn" }}
                              />
                              </span>
                            </button>
                          </div>
                        </motion.div>
                      )})}
                    </div>
                  ))
                )}
                {voiceClips.length > 0 ? (
                  <div className="pt-3">
                    <div
                      className={`mt-2 mb-2 px-5 text-[11px] uppercase tracking-[0.08em] font-[family-name:var(--font-manrope)] ${
                        settings.darkMode ? "text-white/48" : "text-black/45"
                      }`}
                    >
                      Voice
                    </div>
                    {voiceClips.map((clip) => (
                      <div key={clip.id} className="w-full min-h-14 px-5 py-3">
                        <audio controls src={clip.audioDataUrl} className="h-8 w-full" />
                        <div className="mt-1 flex items-center justify-between">
                          <p
                            className={`text-[11px] font-[family-name:var(--font-manrope)] ${
                              settings.darkMode ? "text-white/48" : "text-black/46"
                            }`}
                          >
                            {formatVoiceDuration(clip.durationMs)}
                          </p>
                          <button
                            type="button"
                            aria-label="Delete voice clip"
                            className={`text-[11px] font-[family-name:var(--font-manrope)] ${
                              settings.darkMode ? "text-white/45" : "text-black/45"
                            }`}
                            onClick={() => deleteVoiceClip(clip.id)}
                          >
                            delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div
                  className={`pointer-events-none absolute inset-x-0 bottom-0 h-12 ${
                    settings.darkMode
                      ? "bg-gradient-to-t from-[#171717] to-transparent"
                      : "bg-gradient-to-t from-[#e8e8e4] to-transparent"
                  }`}
                />
              </div>
            </motion.aside>
          ) : null}
        </AnimatePresence>

        <footer
          className={`absolute bottom-0 left-0 z-50 py-[11px] backdrop-blur transition-[right] duration-200 ease-out ${gutterClass} ${footerBg} ${footerRightClass}`}
          onMouseDownCapture={keepWritingFocusOnControlClick}
          style={{ display: isMobile ? "none" : undefined }}
        >
            <div className={`${compactControls ? "h-6" : "h-7"} flex items-center overflow-x-auto whitespace-nowrap`}>
            {settings.mode === "Chat" ? (
              <div className="flex min-w-0 flex-1 items-center gap-0 overflow-hidden">
                <Button
                  size="sm"
                  radius="none"
                  variant="light"
                  className={`${controlClass} shrink-0`}
                  onPress={toggleFontSize}
                >
                  {settings.fontSize}px
                </Button>
                <span className={dotClass}>•</span>
                {["Lato", "Arial", "System", "Serif", "Random"].map((font, index, arr) => (
                  <div key={font} className="flex items-center">
                    <Button
                      size="sm"
                      radius="none"
                      variant="light"
                      className={`${controlClass} ${font === "Random" ? "max-w-[140px] sm:max-w-[180px] truncate" : ""} ${
                        settings.fontOption === font ? (settings.darkMode ? "text-white/85" : "text-black/85") : mutedText
                      }`}
                      onPress={() => handleFontOption(font as "Lato" | "Arial" | "System" | "Serif" | "Random")}
                    >
                      {font === "Random"
                        ? settings.randomFontName
                          ? `Random {${settings.randomFontName}}`
                          : "Random"
                        : font}
                    </Button>
                    {index < arr.length - 1 ? (
                      <span className={dotClass}>•</span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex min-w-0 flex-1 items-center gap-0 overflow-hidden">
                <p className={`truncate font-[family-name:var(--font-manrope)] text-[11px] ${mutedText}`}>
                  voice journal
                </p>
              </div>
            )}

            <div className="ml-1 flex shrink-0 items-center gap-0">
              <div className="flex items-center">
              <Button
                size="sm"
                radius="none"
                variant="light"
                className={`${controlClass} tracking-[0.08em] ${settings.timerRunning ? "opacity-100" : ""}`}
                onPress={toggleTimer}
                onDoubleClick={resetTimer}
              >
                {timerLabel}
              </Button>
              <span className={dotClass}>•</span>
              <Button
                size="sm"
                radius="none"
                variant="light"
                className={`${controlClass} ${settings.mode === "Voice" ? "opacity-100" : ""}`}
                onPress={toggleMode}
              >
                <motion.span
                  key={settings.mode}
                  initial={{ scale: 0.95, opacity: 0.8 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.16, ease: "easeOut" }}
                  className="inline-flex h-full translate-y-[1px] items-center justify-center align-middle"
                >
                  {settings.mode === "Voice" ? (
                    <svg
                      viewBox="0 0 24 24"
                      className={compactControls ? "h-5 w-5" : "h-6 w-6"}
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <rect x="9" y="3.5" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M6.5 11.5a5.5 5.5 0 1 0 11 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M12 17v3.5M9.5 20.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      className={compactControls ? "h-5 w-5" : "h-6 w-6"}
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M6 8.2C6 6.43 7.43 5 9.2 5H14.8C16.57 5 18 6.43 18 8.2V11.8C18 13.57 16.57 15 14.8 15H11.2L8 18V15H9.2C7.43 15 6 13.57 6 11.8V8.2Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </motion.span>
              </Button>
              <span className={dotClass}>•</span>
              {settings.mode === "Chat" ? (
                <Button
                  size="sm"
                  radius="none"
                  variant="light"
                  className={controlClass}
                  onPress={() =>
                    setSettings((prev) => ({
                      ...prev,
                      backspaceOn: !prev.backspaceOn,
                    }))
                  }
                >
                  Backspace is {settings.backspaceOn ? "On" : "Off"}
                </Button>
              ) : (
                <p className={`font-[family-name:var(--font-manrope)] text-[11px] ${mutedText}`}>recording tools</p>
              )}
              </div>
              <span className={splitDotClass}>•</span>
              <div className="flex items-center">
              <Button
                size="sm"
                radius="none"
                variant="light"
                className={controlClass}
                onPress={toggleFullscreen}
              >
                {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              </Button>
              <span className={dotClass}>•</span>
              {settings.mode === "Chat" ? (
                <>
                  <Button
                    size="sm"
                    radius="none"
                    variant="light"
                    className={controlClass}
                    onPress={startNewEntry}
                  >
                    New Entry
                  </Button>
                  <span className={dotClass}>•</span>
                </>
              ) : null}
              <Button
                size="sm"
                radius="none"
                variant="light"
                className={`${controlClass} min-w-0 px-2 ${compactControls ? "text-[14px]" : "text-[16px]"}`}
                onPress={() =>
                  setSettings((prev) => ({
                    ...prev,
                    darkMode: !prev.darkMode,
                  }))
                }
              >
                {settings.darkMode ? (
                  "☀"
                ) : (
                  <Image
                    src="/icons/theme-moon.png"
                    alt="theme"
                    width={20}
                    height={20}
                    className={`${compactControls ? "h-4 w-4" : "h-5 w-5"} object-contain opacity-65`}
                  />
                )}
              </Button>
              <span className={dotClass}>•</span>
              <Button
                size="sm"
                radius="none"
                variant="light"
                className={`${controlClass} min-w-0 px-2 ${compactControls ? "text-[14px]" : "text-[16px]"}`}
                onPress={() => setHistoryOpen((prev) => !prev)}
              >
                <Image
                  src="/icons/history.png"
                  alt="history"
                  width={20}
                  height={20}
                  className={`${compactControls ? "h-3.5 w-3.5" : "h-4 w-4"} object-contain ${
                    historyOpen ? "opacity-100" : "opacity-65"
                  } ${settings.darkMode ? "invert" : ""
                  }`}
                />
              </Button>
              </div>
            </div>
          </div>
        </footer>
        <footer
          className={`absolute bottom-0 left-0 right-0 z-50 px-4 pb-3 pt-2 backdrop-blur sm:hidden ${footerBg}`}
          onMouseDownCapture={keepWritingFocusOnControlClick}
          style={{ display: isMobile ? undefined : "none" }}
        >
          <div className="flex h-10 items-center justify-between gap-1">
            <Button size="sm" radius="full" variant="light" className="px-2 text-[12px]" onPress={toggleTimer} onDoubleClick={resetTimer}>
              {timerLabel}
            </Button>
            <Button size="sm" radius="full" variant="light" className="px-2" onPress={toggleMode}>
              {settings.mode === "Voice" ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="9" y="3.5" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M6.5 11.5a5.5 5.5 0 1 0 11 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M12 17v3.5M9.5 20.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M6 8.2C6 6.43 7.43 5 9.2 5H14.8C16.57 5 18 6.43 18 8.2V11.8C18 13.57 16.57 15 14.8 15H11.2L8 18V15H9.2C7.43 15 6 13.57 6 11.8V8.2Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </Button>
            <Button size="sm" radius="full" variant="light" className="px-2 text-[12px]" onPress={toggleFullscreen}>
              fs
            </Button>
            <Button size="sm" radius="full" variant="light" className="px-2" onPress={() => setHistoryOpen((prev) => !prev)}>
              <Image src="/icons/history.png" alt="history" width={18} height={18} className={`h-4 w-4 object-contain ${settings.darkMode ? "invert" : ""}`} />
            </Button>
            <Button
              size="sm"
              radius="full"
              variant="light"
              className="px-2"
              onPress={() =>
                setSettings((prev) => ({
                  ...prev,
                  darkMode: !prev.darkMode,
                }))
              }
            >
              {settings.darkMode ? "☀" : <Image src="/icons/theme-moon.png" alt="theme" width={18} height={18} className="h-4 w-4 object-contain opacity-70" />}
            </Button>
          </div>
          <div className="mt-1 flex h-9 items-center gap-1 overflow-x-auto whitespace-nowrap">
            {settings.mode === "Chat" ? (
              <>
                <Button size="sm" radius="full" variant="light" className="px-2 text-[11px]" onPress={toggleFontSize}>
                  {settings.fontSize}px
                </Button>
                {["Lato", "Arial", "System", "Serif", "Random"].map((font) => (
                  <Button
                    key={`m-${font}`}
                    size="sm"
                    radius="full"
                    variant="light"
                    className="px-2 text-[11px]"
                    onPress={() => handleFontOption(font as "Lato" | "Arial" | "System" | "Serif" | "Random")}
                  >
                    {font === "Random" ? "Random" : font}
                  </Button>
                ))}
                <Button
                  size="sm"
                  radius="full"
                  variant="light"
                  className="px-2 text-[11px]"
                  onPress={() =>
                    setSettings((prev) => ({
                      ...prev,
                      backspaceOn: !prev.backspaceOn,
                    }))
                  }
                >
                  backspace {settings.backspaceOn ? "on" : "off"}
                </Button>
                <Button size="sm" radius="full" variant="light" className="px-2 text-[11px]" onPress={startNewEntry}>
                  new
                </Button>
              </>
            ) : (
              <p className={`px-1 text-[11px] font-[family-name:var(--font-manrope)] ${mutedText}`}>voice controls are on canvas</p>
            )}
          </div>
        </footer>
        {voiceError ? (
          <p
            className={`absolute right-4 text-[11px] font-[family-name:var(--font-manrope)] ${
              settings.darkMode ? "text-white/50" : "text-black/50"
            }`}
            style={{ bottom: `${footerHeight + 6}px` }}
          >
            {voiceError}
          </p>
        ) : null}
      </motion.main>
    </div>
  );
}
