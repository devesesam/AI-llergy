"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
  };
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx.toast;
}

const STYLES: Record<ToastType, { cls: string; icon: React.ReactNode }> = {
  success: {
    cls: "bg-success-bg text-success border-success/30",
    icon: <CheckCircle2 className="w-5 h-5" />,
  },
  error: {
    cls: "bg-danger-bg text-danger border-danger/30",
    icon: <AlertCircle className="w-5 h-5" />,
  },
  info: {
    cls: "bg-surface text-text border-border",
    icon: <Info className="w-5 h-5 text-text-muted" />,
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, message: string) => {
      const id = ++idRef.current;
      setItems((prev) => [...prev, { id, type, message }]);
      setTimeout(() => remove(id), 4000);
    },
    [remove]
  );

  const toast = useRef({
    success: (m: string) => push("success", m),
    error: (m: string) => push("error", m),
    info: (m: string) => push("info", m),
  }).current;

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)]">
            <AnimatePresence>
              {items.map((t) => (
                <motion.div
                  key={t.id}
                  layout
                  initial={{ opacity: 0, y: 12, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 20, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  className={cn(
                    "flex items-start gap-3 rounded-xl border px-4 py-3 shadow-md text-sm",
                    STYLES[t.type].cls
                  )}
                >
                  <span className="flex-shrink-0 mt-0.5">
                    {STYLES[t.type].icon}
                  </span>
                  <p className="flex-1 text-text">{t.message}</p>
                  <button
                    onClick={() => remove(t.id)}
                    aria-label="Dismiss"
                    className="flex-shrink-0 text-text-muted hover:text-text transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}
