export type ToastType = 'success' | 'error' | 'info' | 'warning';

export let addToastFn: ((message: string, type?: ToastType, duration?: number) => void) | null = null;
export let showConfirmFn: ((message: string) => Promise<boolean>) | null = null;

export function setToastFn(fn: typeof addToastFn) { addToastFn = fn; }
export function setConfirmFn(fn: typeof showConfirmFn) { showConfirmFn = fn; }

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
