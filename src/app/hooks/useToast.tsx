import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { X, AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

type ToastType = 'error' | 'success' | 'warning' | 'info';

type Toast = {
  id: string;
  type: ToastType;
  message: string;
};

type ToastInput = Omit<Toast, 'id'>;

type ToastContextValue = {
  toast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const ICON_MAP: Record<ToastType, React.ElementType> = {
  error: AlertCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
};

const DURATION_MAP: Record<ToastType, number> = {
  error: 8000,
  success: 4000,
  warning: 6000,
  info: 4000,
};

const BG_MAP: Record<ToastType, string> = {
  error: 'rgba(239,68,68,0.08)',
  success: 'rgba(16,185,129,0.07)',
  warning: 'rgba(245,158,11,0.08)',
  info: 'rgba(94,106,210,0.08)',
};

const BORDER_MAP: Record<ToastType, string> = {
  error: 'rgba(239,68,68,0.2)',
  success: 'rgba(16,185,129,0.2)',
  warning: 'rgba(245,158,11,0.2)',
  info: 'rgba(94,106,210,0.2)',
};

const COLOR_MAP: Record<ToastType, string> = {
  error: '#ef4444',
  success: '#10b981',
  warning: '#f59e0b',
  info: '#5e6ad2',
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const Icon = ICON_MAP[toast.type];
  return (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg text-sm"
      style={{
        backgroundColor: BG_MAP[toast.type],
        borderColor: BORDER_MAP[toast.type],
        minWidth: 280,
        maxWidth: 420,
      }}
    >
      <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: COLOR_MAP[toast.type] }} />
      <span className="flex-1" style={{ color: 'var(--text-primary)' }}>{toast.message}</span>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="p-0.5 rounded opacity-60 hover:opacity-100 transition-opacity shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((input: ToastInput) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...input, id }]);
    const ms = DURATION_MAP[input.type];
    setTimeout(() => removeToast(id), ms);
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem toast={t} onDismiss={removeToast} />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
