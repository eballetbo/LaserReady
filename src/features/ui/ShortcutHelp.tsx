import { useEffect } from 'react';
import { X } from 'lucide-react';
import { SHORTCUT_DESCRIPTIONS } from '../../config/shortcuts';

interface ShortcutHelpProps {
    onClose: () => void;
}

const CATEGORIES: { title: string; keys: string[] }[] = [
    {
        title: 'File',
        keys: ['Ctrl+N', 'Ctrl+S']
    },
    {
        title: 'Tools',
        keys: ['V', 'N', 'P', 'R', 'E', 'T', 'O', 'F', 'S']
    },
    {
        title: 'Edit',
        keys: ['Ctrl+Z', 'Ctrl+Shift+Z', 'Ctrl+C', 'Ctrl+X', 'Ctrl+V', 'Ctrl+D', 'Ctrl+A', 'Delete']
    },
    {
        title: 'Z-Order',
        keys: ['Ctrl+]', 'Ctrl+[', 'Ctrl+Shift+]', 'Ctrl+Shift+[']
    },
    {
        title: 'Transform',
        keys: ['Arrow keys', 'Shift+Arrow']
    },
    {
        title: 'View',
        keys: ['Ctrl+0', 'Ctrl++', 'Ctrl+-']
    }
];

export default function ShortcutHelp({ onClose }: ShortcutHelpProps) {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            onClick={onClose}
        >
            <div
                className="bg-gray-900 text-gray-100 rounded-lg shadow-2xl border border-gray-700 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                    <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded hover:bg-gray-700 transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {CATEGORIES.map(category => (
                        <div key={category.title}>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                                {category.title}
                            </h3>
                            <div className="space-y-1">
                                {category.keys.map(key => {
                                    const desc = SHORTCUT_DESCRIPTIONS[key];
                                    if (!desc) return null;
                                    return (
                                        <div key={key} className="flex items-center justify-between py-0.5">
                                            <span className="text-sm text-gray-300">{desc}</span>
                                            <kbd className="ml-4 px-2 py-0.5 text-xs font-mono bg-gray-800 border border-gray-600 rounded text-gray-200">
                                                {key}
                                            </kbd>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="px-6 py-3 border-t border-gray-700 text-center">
                    <span className="text-xs text-gray-500">
                        Press <kbd className="px-1.5 py-0.5 text-xs font-mono bg-gray-800 border border-gray-600 rounded">?</kbd> to toggle this overlay
                    </span>
                </div>
            </div>
        </div>
    );
}
