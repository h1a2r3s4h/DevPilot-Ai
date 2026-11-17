import React from "react";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "./ui/button";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/75 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-2xl relative text-zinc-900 dark:text-zinc-100 animate-scale-in"
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-300 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl border shrink-0 ${isDestructive ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/20 text-rose-600 dark:text-rose-400' : 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/20 text-cyan-600 dark:text-cyan-400'}`}>
            <AlertTriangle size={22} />
          </div>
          <div className="space-y-1.5 flex-1 pr-6">
            <h3 className="font-heading font-bold text-base text-zinc-900 dark:text-zinc-100">{title}</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 font-sans leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-zinc-200 dark:border-zinc-900">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs shadow-2xs"
          >
            {cancelText}
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            className={`text-xs font-semibold shadow-sm active:scale-95 transition-all ${
              isDestructive
                ? "bg-rose-600 hover:bg-rose-500 text-white"
                : "bg-cyan-600 hover:bg-cyan-500 text-white"
            }`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
