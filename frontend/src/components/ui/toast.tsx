"use client";

import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, title?: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', title?: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message, title }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, [removeToast]);

  const value: ToastContextType = {
    toast: addToast,
    success: (msg, title) => addToast(msg, 'success', title),
    error: (msg, title) => addToast(msg, 'error', title),
    info: (msg, title) => addToast(msg, 'info', title),
    warning: (msg, title) => addToast(msg, 'warning', title),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-md w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((t) => {
          const typeStyles: Record<ToastType, { bg: string; border: string; text: string; icon: string }> = {
            success: {
              bg: 'bg-emerald-50 border-emerald-200',
              border: 'text-emerald-800',
              text: 'text-emerald-700',
              icon: '✓',
            },
            error: {
              bg: 'bg-rose-50 border-rose-200',
              border: 'text-rose-800',
              text: 'text-rose-700',
              icon: '✕',
            },
            warning: {
              bg: 'bg-amber-50 border-amber-200',
              border: 'text-amber-800',
              text: 'text-amber-700',
              icon: '⚠',
            },
            info: {
              bg: 'bg-blue-50 border-blue-200',
              border: 'text-blue-800',
              text: 'text-blue-700',
              icon: 'ℹ',
            },
          };

          const s = typeStyles[t.type];

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2 ${s.bg}`}
              role="alert"
            >
              <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs bg-white shadow-sm ${s.border}`}>
                {s.icon}
              </div>
              <div className="flex-1 min-w-0">
                {t.title && <h5 className={`font-semibold text-sm ${s.border}`}>{t.title}</h5>}
                <p className={`text-xs leading-relaxed mt-0.5 ${s.text}`}>{t.message}</p>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
