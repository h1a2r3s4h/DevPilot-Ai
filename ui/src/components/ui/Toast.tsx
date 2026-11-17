import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toast: (options: Omit<ToastMessage, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ type, title, description, duration = 4000 }: Omit<ToastMessage, "id">) => {
      const id = "toast_" + Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { id, type, title, description, duration };
      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toast, removeToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map((t) => {
          const icon =
            t.type === "success" ? (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0 mt-0.5" />
            ) : t.type === "error" ? (
              <XCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
            ) : t.type === "warning" ? (
              <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <Info size={16} className="text-cyan-400 shrink-0 mt-0.5" />
            );

          const borderBg =
            t.type === "success"
              ? "border-emerald-500/30 bg-white/95 dark:bg-zinc-950/90 text-emerald-800 dark:text-emerald-200 shadow-emerald-500/5"
              : t.type === "error"
              ? "border-rose-500/30 bg-white/95 dark:bg-zinc-950/90 text-rose-800 dark:text-rose-200 shadow-rose-500/5"
              : t.type === "warning"
              ? "border-amber-500/30 bg-white/95 dark:bg-zinc-950/90 text-amber-800 dark:text-amber-200 shadow-amber-500/5"
              : "border-cyan-500/30 bg-white/95 dark:bg-zinc-950/90 text-cyan-800 dark:text-cyan-200 shadow-cyan-500/5";

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border backdrop-blur-xl shadow-lg dark:shadow-2xl transition-all animate-fade-in-up ${borderBg}`}
            >
              {icon}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">{t.title}</div>
                {t.description && (
                  <div className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5 break-words font-mono leading-relaxed">
                    {t.description}
                  </div>
                )}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors p-0.5 rounded"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
