import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none sm:bottom-6 sm:right-6">
        <AnimatePresence>
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onRemove={() => removeToast(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const icons = {
    success: <Check className="h-5 w-5 text-[#16A34A]" />,
    warning: <AlertTriangle className="h-5 w-5 text-[#EAB308]" />,
    error: <XCircle className="h-5 w-5 text-[#DC2626]" />,
    info: <Info className="h-5 w-5 text-[#06B6D4]" />,
  };

  const borders = {
    success: 'border-[#16A34A]',
    warning: 'border-[#EAB308]',
    error: 'border-[#DC2626]',
    info: 'border-[#06B6D4]',
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 50, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={`pointer-events-auto flex items-center gap-3 bg-surface p-4 brutal-border shadow-[4px_4px_0px_#0A0A0A] border-l-4 ${borders[toast.type]} min-w-[300px]`}
    >
      <div className="shrink-0">{icons[toast.type]}</div>
      <div className="flex-1 font-display font-bold text-sm text-foreground">{toast.message}</div>
      <button onClick={onRemove} className="shrink-0 p-1 hover:bg-background brutal-border text-muted hover:text-foreground">
        <X className="h-4 w-4" />
      </button>
    </motion.div>
  );
}
