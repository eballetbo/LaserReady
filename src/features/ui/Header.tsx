import { useRef, useState } from 'react';
import { Sun, Moon, Download, Upload, Undo2, Redo2, ZoomIn, ZoomOut, Maximize, Github, Coffee, Languages, Hand } from 'lucide-react';
import { CanvasController } from '../shapes';
import { PIXELS_PER_MM } from '../../config/constants';
import { useLanguage } from '../../contexts/useLanguage';
import { ThemeColors } from '../../config/themes';
import { PathShape } from '../shapes/models/path';
import { exportToSVG, downloadSVG } from '../io/svg-export';
import { importProjectFile } from '../persistence/auto-save';
import { useStore } from '../../store/useStore';
import { useShallow } from 'zustand/react/shallow';
import { notify } from './toast-utils';

interface HeaderProps {
    editor: CanvasController | null;
    theme: ThemeColors;
}

export function Header({ editor, theme }: HeaderProps) {
    const { isDarkMode, setDarkMode, material, setMaterial, tool, setTool } = useStore(useShallow(state => ({
        isDarkMode: state.isDarkMode,
        setDarkMode: state.setDarkMode,
        material: state.material,
        setMaterial: state.setMaterial,
        tool: state.tool,
        setTool: state.setTool,
    })));

    const { language, setLanguage, t } = useLanguage();
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleExport = () => {
        if (!editor) return;
        const layers = useStore.getState().layers;
        const svgString = exportToSVG(editor.shapes as PathShape[], material.width, material.height, layers);
        downloadSVG(svgString, 'laser-design.svg');
    };

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
                if (file.name.endsWith('.laser')) {
                    const success = importProjectFile(result);
                    if (success) {
                        editor?.render();
                        notify('Project loaded successfully', 'success');
                    } else {
                        notify('Failed to load project file — it may be corrupted or unsupported', 'error');
                    }
                } else {
                    editor?.importSVGString(result);
                    notify(`Imported ${file.name}`, 'success');
                }
            }
        };
        reader.onerror = () => {
            notify('Failed to read file', 'error');
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    return (
        <header className={`h-14 ${theme.panel} border-b ${theme.border} flex items-center justify-between px-4 shrink-0 z-20`}>
            <div className="flex items-center gap-3">
                <div className={`w-9 h-9 ${theme.inputBg} border ${theme.inputBorder} rounded-lg flex items-center justify-center relative overflow-hidden group`}>
                    <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-gradient-to-b from-red-500/0 via-red-500/50 to-red-500/0 -translate-x-1/2"></div>
                    <div className={`absolute top-1/2 left-2 right-2 h-px ${isDarkMode ? 'bg-gray-500' : 'bg-gray-400'}`}></div>
                    <div className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,1)] -translate-x-1/2 -translate-y-1/2 z-10 animate-pulse"></div>
                </div>
                <div className="flex flex-col justify-center">
                    <span className={`font-bold tracking-tight ${theme.text} leading-none`}>LaserReady</span>
                    <span className={`text-[10px] ${theme.textMuted} tracking-widest leading-none mt-0.5`}>{`EDITOR (v${__APP_VERSION__})`}</span>
                </div>

                {/* LANGUAGE SELECTOR */}
                <div className="relative ml-4">
                    <button
                        onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                        className={`flex items-center gap-1 p-2 rounded ${theme.buttonHover} ${theme.textMuted} text-xs font-bold uppercase`}
                        aria-label="Language"
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
                                        setLanguage(lang as 'en' | 'es' | 'ca');
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
                        aria-label="Material width (mm)"
                        value={(material.width / PIXELS_PER_MM).toFixed(0)}
                        onChange={(e) => setMaterial({ ...material, width: Number(e.target.value) * PIXELS_PER_MM })}
                        className={`w-12 bg-transparent text-sm ${theme.text} text-center focus:outline-none font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                    />
                    <span className={`text-xs ${theme.textMuted} mx-1`}>x</span>
                    <input
                        type="number"
                        aria-label="Material height (mm)"
                        value={(material.height / PIXELS_PER_MM).toFixed(0)}
                        onChange={(e) => setMaterial({ ...material, height: Number(e.target.value) * PIXELS_PER_MM })}
                        className={`w-12 bg-transparent text-sm ${theme.text} text-center focus:outline-none font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                    />
                    <span className={`text-[10px] ${theme.textMuted} ml-2`}>mm</span>
                </div>

                <div className="flex items-center gap-1 mr-2">
                    <button onClick={() => editor?.undo()} className={`p-1.5 rounded ${theme.buttonHover} ${theme.textMuted} hover:text-red-500`} title={`${t('undo')} (Ctrl+Z)`} aria-label={t('undo')}>
                        <Undo2 size={18} />
                    </button>
                    <button onClick={() => editor?.redo()} className={`p-1.5 rounded ${theme.buttonHover} ${theme.textMuted} hover:text-red-500`} title={`${t('redo')} (Ctrl+Shift+Z)`} aria-label={t('redo')}>
                        <Redo2 size={18} />
                    </button>
                </div>

                <div className="flex items-center gap-1 mr-4">
                    <button
                        onClick={() => setTool(tool === 'hand' ? 'select' : 'hand')}
                        className={`p-1.5 rounded ${theme.buttonHover} ${tool === 'hand' ? 'text-red-500 bg-gray-100 dark:bg-gray-800' : theme.textMuted}`}
                        title={t('handTool')}
                        aria-label={t('handTool')}
                        aria-pressed={tool === 'hand'}
                    >
                        <Hand size={18} />
                    </button>
                    <button onClick={() => editor && editor.setZoom(editor.zoom / 1.2)} className={`p-1.5 rounded ${theme.buttonHover} ${theme.textMuted} hover:text-blue-500`} title={t('zoomOut')} aria-label={t('zoomOut')}>
                        <ZoomOut size={18} />
                    </button>
                    <button onClick={() => editor && editor.setZoom(editor.zoom * 1.2)} className={`p-1.5 rounded ${theme.buttonHover} ${theme.textMuted} hover:text-blue-500`} title={t('zoomIn')} aria-label={t('zoomIn')}>
                        <ZoomIn size={18} />
                    </button>
                    <button onClick={() => editor?.resetZoom()} className={`p-1.5 rounded ${theme.buttonHover} ${theme.textMuted} hover:text-blue-500`} title={t('resetZoom')} aria-label={t('resetZoom')}>
                        <Maximize size={18} />
                    </button>
                </div>
                <button onClick={() => setDarkMode(!isDarkMode)} className={`p-2 rounded ${theme.buttonHover}`} aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}>
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
                <a href="https://www.buymeacoffee.com/eballetbo" target="_blank" rel="noopener noreferrer" className={`p-2 rounded ${theme.buttonHover} ${theme.textMuted} hover:text-yellow-500`} title="Buy Me a Coffee" aria-label="Buy Me a Coffee">
                    <Coffee size={20} />
                </a>
                <a href="https://github.com/eballetbo/LaserReady" target="_blank" rel="noopener noreferrer" className={`p-2 rounded ${theme.buttonHover} ${theme.textMuted} hover:text-black dark:hover:text-white`} title="GitHub" aria-label="GitHub repository">
                    <Github size={20} />
                </a>
            </div>

            <div className="flex items-center gap-4">
                <div className="flex gap-2">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".svg,.laser"
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
    );
}
