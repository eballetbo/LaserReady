import { useState, useEffect, useCallback } from 'react';
import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration?: number;
}

let addToastFn: ((message: string, type?: ToastType, duration?: number) => void) | null = null;
let showConfirmFn: ((message: string) => Promise<boolean>) | null = null;

export function notify(message: string, type: ToastType = 'info', duration = 4000) {
    if (addToastFn) {
        addToastFn(message, type, duration);
    } else {
        console.warn('[Toast not mounted]', message);
    }
}

export function confirmDialog(message: string): Promise<boolean> {
    if (showConfirmFn) return showConfirmFn(message);
    return Promise.resolve(window.confirm(message));
}

const ICONS: Record<ToastType, typeof Info> = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    warning: AlertCircle,
};

const COLORS: Record<ToastType, string> = {
    success: 'border-green-500 bg-green-900/90 text-green-100',
    error: 'border-red-500 bg-red-900/90 text-red-100',
    info: 'border-blue-500 bg-blue-900/90 text-blue-100',
    warning: 'border-yellow-500 bg-yellow-900/90 text-yellow-100',
};

interface ConfirmState {
    message: string;
    resolve: (value: boolean) => void;
}

export function ToastContainer() {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);

    const addToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
        const id = crypto.randomUUID();
        setToasts(prev => [...prev, { id, message, type, duration }]);
    }, []);

    const showConfirm = useCallback((message: string): Promise<boolean> => {
        return new Promise(resolve => {
            setConfirmState({ message, resolve });
        });
    }, []);

    useEffect(() => {
        addToastFn = addToast;
        showConfirmFn = showConfirm;
        return () => { addToastFn = null; showConfirmFn = null; };
    }, [addToast, showConfirm]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const handleConfirm = useCallback((result: boolean) => {
        confirmState?.resolve(result);
        setConfirmState(null);
    }, [confirmState]);

    return (
        <>
            <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm" aria-live="polite">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
                ))}
            </div>
            {confirmState && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="confirm-msg">
                    <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 max-w-sm shadow-xl">
                        <p id="confirm-msg" className="text-sm text-gray-100 mb-4">{confirmState.message}</p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => handleConfirm(false)}
                                className="px-3 py-1.5 text-sm rounded border border-gray-500 text-gray-300 hover:bg-gray-700"
                                aria-label="Cancel"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleConfirm(true)}
                                className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-500"
                                autoFocus
                                aria-label="Confirm"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
    useEffect(() => {
        if (!toast.duration) return;
        const timer = setTimeout(() => onDismiss(toast.id), toast.duration);
        return () => clearTimeout(timer);
    }, [toast.id, toast.duration, onDismiss]);

    const Icon = ICONS[toast.type];

    return (
        <div
            className={`flex items-start gap-2 px-4 py-3 rounded-lg border shadow-lg ${COLORS[toast.type]} animate-[slideIn_0.2s_ease-out]`}
            role="alert"
        >
            <Icon size={16} className="shrink-0 mt-0.5" />
            <span className="text-sm flex-1">{toast.message}</span>
            <button
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 p-0.5 rounded hover:bg-white/10"
                aria-label="Dismiss"
            >
                <X size={14} />
            </button>
        </div>
    );
}
