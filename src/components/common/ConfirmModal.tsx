import React, { useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Trash2,
  HelpCircle,
  X,
  Loader2,
} from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmVariant;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'danger',
  isLoading = false,
  onConfirm,
  onClose,
}) => {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        confirmBtnRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: Trash2,
          iconBadge:
            'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800/80 text-rose-600 dark:text-rose-400',
          confirmBtn:
            'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20 hover:shadow-rose-600/30 border border-transparent',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          iconBadge:
            'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800/80 text-amber-600 dark:text-amber-400',
          confirmBtn:
            'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20 hover:shadow-amber-600/30 border border-transparent',
        };
      case 'info':
      default:
        return {
          icon: HelpCircle,
          iconBadge:
            'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800/80 text-sky-600 dark:text-sky-400',
          confirmBtn:
            'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/20 hover:shadow-sky-600/30 border border-transparent',
        };
    }
  };

  const { icon: Icon, iconBadge, confirmBtn } = getVariantStyles();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200 select-none"
      onClick={() => {
        if (!isLoading) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 sm:p-7 space-y-5 text-zinc-900 dark:text-zinc-100 transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Icon and Close Button */}
        <div className="flex items-start justify-between">
          <div
            className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${iconBadge}`}
          >
            <Icon className="w-6 h-6" />
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
            title="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
            {title}
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
            {description}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700/80 bg-white dark:bg-zinc-800/90 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
          >
            {cancelLabel}
          </button>

          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 ${confirmBtn}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <span>{confirmLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
