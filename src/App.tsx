import { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Download, Upload, Undo2, Redo2, ZoomIn, ZoomOut, Maximize, Github, Coffee } from 'lucide-react';
import Toolbar from './components/toolbar';
import RightSidebar from './components/right-sidebar';
import Canvas from './features/editor/Canvas';
import { LASER_MODES } from './utils/laser-modes';
import { LanguageProvider, useLanguage } from './contexts/language';
import { Languages } from 'lucide-react';
import { exportToSVG, downloadSVG } from './utils/svg-exporter';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { PathEditor } from './features/editor/path-editor'; // Import type if available (it is a class)

// --- CONSTANTS ---
// Material size in MM
import { useStore } from './store/useStore';
import { useShallow } from 'zustand/react/shallow';

// --- THEME CONFIGURATION ---
interface ThemeColors {
    bg: string;
    panel: string;
    border: string;
    text: string;
    textMuted: string;
    canvasWrapper: string;
    inputBg: string; // Made required to match updated Theme interface logic
    inputBorder: string;
    buttonHover: string;
    iconColor: string;
    [key: string]: string; // Index signature for Theme interface compatibility
}

const THEMES: { dark: ThemeColors; light: ThemeColors } = {
    dark: {
        bg: 'bg-[#1a1a1a]',
        panel: 'bg-[#252525]',
        border: 'border-[#333]',
        text: 'text-gray-200',
        textMuted: 'text-gray-500',
        canvasWrapper: '#111111',
        inputBg: 'bg-gray-900',
        inputBorder: 'border-gray-700',
        buttonHover: 'hover:bg-gray-700',
        iconColor: 'text-gray-400',
    },
    light: {
        bg: 'bg-[#f3f4f6]',
        panel: 'bg-white',
        border: 'border-gray-200',
        text: 'text-gray-800',
        textMuted: 'text-gray-400',
        canvasWrapper: '#e5e5e5',
        inputBg: 'bg-gray-50',
        inputBorder: 'border-gray-300',
        buttonHover: 'hover:bg-gray-100',
        iconColor: 'text-gray-600',
    }
};

export default function App() {
    return (
        <LanguageProvider>
            <AppContent />
        </LanguageProvider>
    );
}

function AppContent() {
    // State
    const {
        isDarkMode, setDarkMode,
        material, setMaterial,
        tool, setTool
    } = useStore(useShallow(state => ({
        isDarkMode: state.isDarkMode,
        setDarkMode: state.setDarkMode,
        material: state.material,
        setMaterial: state.setMaterial,
        tool: state.tool,
        setTool: state.setTool
    })));

    const theme = isDarkMode ? THEMES.dark : THEMES.light;
    // const [material, setMaterial] = useState(INITIAL_MATERIAL); // Removed
    // const [tool, setTool] = useState('select'); // Removed
    const [editor, setEditor] = useState<PathEditor | null>(null);
    const [selection, setSelection] = useState<any[]>([]); // Typed as any[] for now

    const { language, setLanguage, t } = useLanguage();
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

    // --- ACTIONS ---

    const applyLaserMode = (modeKey: string) => {
        const mode = LASER_MODES[modeKey];
        if (!mode) return;

        const style = {
            strokeColor: mode.color,
            strokeWidth: mode.strokeWidth,
            fillColor: mode.fill
        };
        editor?.applyStyle(style);
    };

    const deleteSelected = () => {
        editor?.deleteSelected();
    };

    // Global Key handlers
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            // Ignore if typing in an input
            const target = e.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

            if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();

            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    editor?.redo();
                } else {
                    editor?.undo();
                }
            }

            if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
                e.preventDefault();
                editor?.redo();
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [editor]);

    // --- FILE I/O ---
    const handleExport = () => {
        if (!editor) return;
        const svgString = exportToSVG(editor.shapes, material.width, material.height);
        downloadSVG(svgString, 'laser-design.svg');
    };

    const fileInputRef = useRef<HTMLInputElement>(null);
    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (f) => {
            const result = f.target?.result;
            if (typeof result === 'string') {
                editor?.importSVGString(result);
            }
        };
        reader.readAsText(file);
        e.target.value = ''; // Reset
    };


    return (
        <div className={`flex flex-col h-screen ${theme.bg} ${theme.text} font-sans overflow-hidden transition-colors duration-300`}>

            {/* HEADER */}
            <header className={`h-14 ${theme.panel} border-b ${theme.border} flex items-center justify-between px-4 shrink-0 z-20`}>
                <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 ${theme.inputBg} border ${theme.inputBorder} rounded-lg flex items-center justify-center relative overflow-hidden group`}>
                        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-gradient-to-b from-red-500/0 via-red-500/50 to-red-500/0 -translate-x-1/2"></div>
                        <div className={`absolute top-1/2 left-2 right-2 h-px ${isDarkMode ? 'bg-gray-500' : 'bg-gray-400'}`}></div>
                        <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,1)] -translate-x-1/2 -translate-y-1/2 z-10 animate-pulse"></div>
                    </div>
                    <div className="flex flex-col justify-center">
                        <span className={`font-bold tracking-tight ${theme.text} leading-none`}>LaserReady</span>
                        <span className={`text-[10px] ${theme.textMuted} uppercase tracking-widest leading-none mt-0.5`}>{t('editorAlpha')}</span>
                    </div>

                    {/* LANGUAGE SELECTOR */}
                    <div className="relative ml-4">
                        <button
                            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                            className={`flex items-center gap-1 p-2 rounded ${theme.buttonHover} ${theme.textMuted} text-xs font-bold uppercase`}
                        >
                            <Languages size={16} />
                            <span>{language}</span>
                        </button>

                        {isLangMenuOpen && (
                            <div className={`absolute top-full left-0 mt-1 w-24 py-1 rounded shadow-lg border ${theme.border} ${theme.panel} z-50`}>
                                {['en', 'es', 'ca'].map(lang => (
                                    <button
                                        key={lang}
                                        onClick={() => {
                                            setLanguage(lang as any);
                                            setIsLangMenuOpen(false);
                                        }}
                                        className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 ${language === lang ? 'font-bold text-red-500' : theme.text}`}
                                    >
                                        {t(`lang_${lang}`)}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* MATERIAL CONFIG */}
                <div className="flex items-center gap-4">
                    <div className={`flex items-center px-4 py-1.5 rounded-full border ${theme.border} ${isDarkMode ? 'bg-[#111]' : 'bg-gray-100'}`}>
                        <span className={`text-[10px] font-bold ${theme.textMuted} uppercase mr-3 tracking-wider`}>{t('area')}:</span>
                        <input
                            type="number"
                            value={material.width}
                            onChange={(e) => setMaterial({ ...material, width: Number(e.target.value) })}
                            className={`w-12 bg-transparent text-sm ${theme.text} text-center focus:outline-none font-medium`}
                        />
                        <span className={`text-xs ${theme.textMuted} mx-1`}>x</span>
                        <input
                            type="number"
                            value={material.height}
                            onChange={(e) => setMaterial({ ...material, height: Number(e.target.value) })}
                            className={`w-12 bg-transparent text-sm ${theme.text} text-center focus:outline-none font-medium`}
                        />
                        <span className={`text-[10px] ${theme.textMuted} ml-2`}>px</span>
                    </div>

                    <div className="flex items-center gap-1 mr-2">
                        <button onClick={() => editor?.undo()} className={`p-1.5 rounded ${theme.buttonHover} ${theme.textMuted} hover:text-red-500`} title={`${t('undo')} (Ctrl+Z)`}>
                            <Undo2 size={18} />
                        </button>
                        <button onClick={() => editor?.redo()} className={`p-1.5 rounded ${theme.buttonHover} ${theme.textMuted} hover:text-red-500`} title={`${t('redo')} (Ctrl+Shift+Z)`}>
                            <Redo2 size={18} />
                        </button>
                    </div>

                    <div className="flex items-center gap-1 mr-4">
                        <button onClick={() => editor?.zoomOut()} className={`p-1.5 rounded ${theme.buttonHover} ${theme.textMuted} hover:text-blue-500`} title={t('zoomOut')}>
                            <ZoomOut size={18} />
                        </button>
                        <button onClick={() => editor?.zoomIn()} className={`p-1.5 rounded ${theme.buttonHover} ${theme.textMuted} hover:text-blue-500`} title={t('zoomIn')}>
                            <ZoomIn size={18} />
                        </button>
                        <button onClick={() => editor?.resetZoom()} className={`p-1.5 rounded ${theme.buttonHover} ${theme.textMuted} hover:text-blue-500`} title={t('resetZoom')}>
                            <Maximize size={18} />
                        </button>
                    </div>
                    <button onClick={() => setDarkMode(!isDarkMode)} className={`p-2 rounded ${theme.buttonHover}`}>
                        {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                    </button>
                    <a href="https://www.buymeacoffee.com/eballetbo" target="_blank" rel="noopener noreferrer" className={`p-2 rounded ${theme.buttonHover} ${theme.textMuted} hover:text-yellow-500`} title="Buy Me a Coffee">
                        <Coffee size={20} />
                    </a>
                    <a href="https://github.com/eballetbo/LaserReady" target="_blank" rel="noopener noreferrer" className={`p-2 rounded ${theme.buttonHover} ${theme.textMuted} hover:text-black dark:hover:text-white`} title="GitHub">
                        <Github size={20} />
                    </a>


                </div>

                <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".svg"
                            className="hidden"
                        />
                        <button onClick={handleImportClick} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded ${theme.buttonHover} border ${theme.border}`}>
                            <Upload size={16} /> {t('import')}
                        </button>
                        <button onClick={handleExport} className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded bg-red-600 text-white hover:bg-red-700 shadow-sm`}>
                            <Download size={16} /> {t('export')}
                        </button>
                    </div>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                <Toolbar tool={tool} setTool={setTool} theme={theme} />

                {/* CANVAS AREA */}
                <div className={`flex-1 relative overflow-auto ${theme.canvasWrapper} flex justify-center items-center p-12`}>
                    <Canvas
                        material={material}
                        setEditorInstance={(ed: any) => { // Type as any for now until PathEditor is fully compatible
                            setEditor(ed as PathEditor);
                            // Hook into selection changes
                            ed.onSelectionChange = (sel: any[]) => setSelection([...sel]);
                        }}
                        tool={tool}
                    />
                </div>

                <RightSidebar
                    theme={theme}
                    selection={selection}
                    editor={editor as any} // Cast to any if needed or ensure PathEditor matches RightSidebar props
                    applyLaserMode={applyLaserMode}
                    deleteSelected={deleteSelected}
                />
            </div>
            <SpeedInsights />
        </div >
    );
}
