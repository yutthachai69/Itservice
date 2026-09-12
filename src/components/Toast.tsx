"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { cn } from "@/lib/ui";

type Tone = "success" | "error" | "info";
type Toast = { id: number; message: string; tone: Tone; leaving?: boolean };

type ToastApi = {
  toast: (message: string, tone?: Tone) => void;
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (ctx) return ctx;
  // No provider mounted (e.g. print view) — degrade to no-op so callers never crash.
  return { toast: () => {}, success: () => {}, error: () => {} };
}

let seq = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismiss = useCallback(
    (id: number) => {
      setItems((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      window.setTimeout(() => remove(id), 180);
    },
    [remove],
  );

  const push = useCallback((message: string, tone: Tone = "info") => {
    const id = ++seq;
    setItems((prev) => [...prev.slice(-3), { id, message, tone }]);
  }, []);

  const api: ToastApi = {
    toast: push,
    success: (m) => push(m, "success"),
    error: (m) => push(m, "error"),
  };

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-16 z-50 flex flex-col items-center gap-2 p-4 sm:items-end xl:bottom-0">
        {items.map((t) => (
          <ToastRow key={t.id} toast={t} dismiss={dismiss} />
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

function ToastRow({ toast, dismiss }: { toast: Toast; dismiss: (id: number) => void }) {
  const { id } = toast;
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || toast.leaving) return;
    const timer = setTimeout(() => dismiss(id), toast.tone === "error" ? 6000 : 3500);
    return () => clearTimeout(timer);
  }, [id, toast.leaving, toast.tone, dismiss, paused]);

  const tones: Record<Tone, { ring: string; icon: React.ReactNode }> = {
    success: { ring: "ring-emerald-200", icon: <CheckCircle2 size={18} className="text-emerald-600" /> },
    error: { ring: "ring-red-200", icon: <XCircle size={18} className="text-red-600" /> },
    info: { ring: "ring-border", icon: <Info size={18} className="text-brand" /> },
  };
  const tone = tones[toast.tone];

  return (
    <div
      role={toast.tone === "error" ? "alert" : "status"}
      aria-live={toast.tone === "error" ? "assertive" : "polite"}
      aria-atomic="true"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-md bg-card px-3.5 py-3 text-sm text-slate-700 shadow-md ring-1",
        tone.ring,
        toast.leaving ? "toast-out" : "toast-in",
      )}
    >
      <span className="mt-0.5 shrink-0" aria-hidden="true">{tone.icon}</span>
      <p className="min-w-0 flex-1">{toast.message}</p>
      <button
        type="button"
        onClick={() => dismiss(id)}
        aria-label="ปิด"
        className="-mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 focus-visible:ring-offset-1"
      >
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
}
