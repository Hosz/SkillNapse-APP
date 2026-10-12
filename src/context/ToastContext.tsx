import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

export interface ToastContextValue {
  show: (item: Omit<ToastItem, 'id'>) => string;
  success: (message: string, title?: string, duration?: number) => string;
  error: (message: string, title?: string, duration?: number) => string;
  warning: (message: string, title?: string, duration?: number) => string;
  info: (message: string, title?: string, duration?: number) => string;
  dismiss: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const show = useCallback(
    ({ type, title, message, duration = 4000 }: Omit<ToastItem, 'id'>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }

      return id;
    },
    [dismiss]
  );

  const success = useCallback(
    (message: string, title?: string, duration = 4000) => {
      return show({ type: 'success', title, message, duration });
    },
    [show]
  );

  const error = useCallback(
    (message: string, title?: string, duration = 5000) => {
      return show({ type: 'error', title, message, duration });
    },
    [show]
  );

  const warning = useCallback(
    (message: string, title?: string, duration = 4500) => {
      return show({ type: 'warning', title, message, duration });
    },
    [show]
  );

  const info = useCallback(
    (message: string, title?: string, duration = 4000) => {
      return show({ type: 'info', title, message, duration });
    },
    [show]
  );

  const value = useMemo(
    () => ({
      show,
      success,
      error,
      warning,
      info,
      dismiss,
      clearAll,
    }),
    [show, success, error, warning, info, dismiss, clearAll]
  );

  const getToastIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-sky-500 shrink-0" />;
    }
  };

  const getBorderColor = (type: ToastType) => {
    switch (type) {
      case 'success':
        return 'border-emerald-200 dark:border-emerald-800/60 shadow-emerald-500/5';
      case 'error':
        return 'border-rose-200 dark:border-rose-800/60 shadow-rose-500/5';
      case 'warning':
        return 'border-amber-200 dark:border-amber-800/60 shadow-amber-500/5';
      case 'info':
      default:
        return 'border-sky-200 dark:border-sky-800/60 shadow-sky-500/5';
    }
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Container fixo de Toasts */}
      <div
        className="fixed top-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
        aria-live="polite"
        role="region"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl p-4 shadow-xl border bg-white dark:bg-zinc-900 flex items-start gap-3 transition-all animate-in slide-in-from-top-3 fade-in duration-200 select-none ${getBorderColor(
              toast.type
            )}`}
          >
            {getToastIcon(toast.type)}
            <div className="flex-1 min-w-0 pr-1">
              {toast.title && (
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-tight mb-0.5">
                  {toast.title}
                </div>
              )}
              <div className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed font-sans break-words">
                {toast.message}
              </div>
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
              title="Fechar notificação"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast deve ser utilizado dentro de um ToastProvider');
  }
  return context;
};
