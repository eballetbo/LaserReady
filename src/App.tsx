import { useState, useEffect } from 'react';
import { Toolbar, RightSidebar } from './features/ui';
import ShortcutHelp from './features/ui/ShortcutHelp';
import { Header } from './features/ui/Header';
import { Canvas } from './features/editor';
import { CanvasController } from './features/shapes';
import { IShape } from './features/shapes/types';
import { LASER_MODES } from './config/laser-modes';
import { THEMES } from './config/themes';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import { LanguageProvider } from './contexts/language';
import { restoreSession, exportProjectFile } from './features/persistence/auto-save';
import { useStore } from './store/useStore';
import { useShallow } from 'zustand/react/shallow';

export default function App() {
    return (
        <LanguageProvider>
            <AppContent />
        </LanguageProvider>
    );
}

function AppContent() {
    const { isDarkMode, material, tool, setTool } = useStore(useShallow(state => ({
        isDarkMode: state.isDarkMode,
        material: state.material,
        tool: state.tool,
        setTool: state.setTool,
    })));

    const theme = isDarkMode ? THEMES.dark : THEMES.light;
    const [editor, setEditor] = useState<CanvasController | null>(null);
    const [selection, setSelection] = useState<IShape[]>([]);
    const [showShortcuts, setShowShortcuts] = useState(false);

    useEffect(() => {
        restoreSession().then(restored => {
            if (restored) editor?.render();
        });
    }, [editor]);

    const applyLaserMode = (modeKey: string) => {
        const mode = LASER_MODES[modeKey];
        if (!mode) return;
        editor?.applyStyle({
            strokeColor: mode.color,
            strokeWidth: mode.strokeWidth,
            fillColor: mode.fill
        });
    };

    const deleteSelected = () => {
        editor?.deleteSelected();
    };

    const handleSaveProject = () => {
        const json = exportProjectFile();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'design.laser';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    useGlobalShortcuts({
        editor,
        tool,
        setTool,
        deleteSelected,
        handleSaveProject,
        setShowShortcuts,
    });

    return (
        <div className={`flex flex-col h-screen ${theme.bg} ${theme.text} font-sans overflow-hidden transition-colors duration-300`}>
            <Header editor={editor} theme={theme} />

            <div className="flex flex-1 overflow-hidden">
                <Toolbar tool={tool} setTool={setTool} theme={theme} />

                <div className={`flex-1 relative overflow-hidden ${theme.canvasWrapper}`}>
                    <Canvas
                        material={material}
                        tool={tool}
                        onInit={setEditor}
                        onSelectionChange={setSelection}
                    />
                </div>

                <RightSidebar
                    theme={theme}
                    selection={selection}
                    editor={editor}
                    applyLaserMode={applyLaserMode}
                    deleteSelected={deleteSelected}
                />
            </div>

            {showShortcuts && <ShortcutHelp onClose={() => setShowShortcuts(false)} />}
        </div>
    );
}
