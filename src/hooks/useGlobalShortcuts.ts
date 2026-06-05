import { useEffect, useRef } from 'react';
import { CanvasController } from '../features/shapes';
import { TOOL_SHORTCUTS } from '../config/shortcuts';
import { ZOOM_STEP } from '../config/constants';

interface ShortcutDeps {
    editor: CanvasController | null;
    tool: string;
    setTool: (tool: string) => void;
    deleteSelected: () => void;
    handleSaveProject: () => void;
    setShowShortcuts: (fn: (prev: boolean) => boolean) => void;
}

export function useGlobalShortcuts(deps: ShortcutDeps) {
    const ref = useRef(deps);
    ref.current = deps;

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

            const { editor, tool, setTool, deleteSelected, handleSaveProject, setShowShortcuts } = ref.current;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (tool !== 'node-edit') deleteSelected();
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) editor?.redo();
                else editor?.undo();
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                editor?.redo();
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); editor?.copy(); }
            if ((e.ctrlKey || e.metaKey) && e.key === 'x') { e.preventDefault(); editor?.cut(); }
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); editor?.paste(); }
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); editor?.duplicate(); }
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); editor?.selectAll(); }

            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSaveProject();
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                if (editor && editor.shapes.length > 0) {
                    if (confirm('Create a new document? Unsaved changes will be lost.')) {
                        editor.newDocument();
                    }
                } else {
                    editor?.newDocument();
                }
            }

            if ((e.ctrlKey || e.metaKey) && e.key === ']') {
                e.preventDefault();
                if (e.shiftKey) editor?.bringToFront();
                else editor?.bringForward();
            }

            if ((e.ctrlKey || e.metaKey) && e.key === '[') {
                e.preventDefault();
                if (e.shiftKey) editor?.sendToBack();
                else editor?.sendBackward();
            }

            if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
                e.preventDefault();
                editor?.setZoom((editor?.zoom ?? 1) * ZOOM_STEP);
            }

            if ((e.ctrlKey || e.metaKey) && e.key === '-') {
                e.preventDefault();
                editor?.setZoom((editor?.zoom ?? 1) / ZOOM_STEP);
            }

            if ((e.ctrlKey || e.metaKey) && e.key === '0') {
                e.preventDefault();
                editor?.resetZoom();
            }

            if (!e.ctrlKey && !e.metaKey && !e.altKey) {
                if (e.key === '?') {
                    setShowShortcuts(prev => !prev);
                    return;
                }
                const toolName = TOOL_SHORTCUTS[e.key.toLowerCase()];
                if (toolName) {
                    setTool(toolName);
                }
            }

            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                if (editor && editor.selectedShapes.length > 0) {
                    e.preventDefault();
                    const step = e.shiftKey ? 10 : 1;
                    const dx = e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0;
                    const dy = e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0;
                    editor.nudge(dx, dy);
                }
            }
        };

        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, []);
}
