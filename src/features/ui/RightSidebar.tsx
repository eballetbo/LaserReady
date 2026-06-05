import { useState } from 'react';
import { Settings, Library } from 'lucide-react';
import { useLanguage } from '../../contexts/language';
import PropertiesPanel from './PropertiesPanel';
import AssetLibrary from './AssetLibrary';
import { CanvasController } from '../editor/controller';

interface Theme {
    iconColor: string;
    buttonHover: string;
    border: string;
    panel: string;
    text: string;
    textMuted: string;
    inputBg?: string;
    inputBorder?: string;
    [key: string]: string | undefined;
}

interface RightSidebarProps {
    theme: Theme;
    selection: any[];
    editor: CanvasController | null;
    applyLaserMode: (mode: string) => void;
    deleteSelected: () => void;
}

export default function RightSidebar({ theme, selection, editor, applyLaserMode, deleteSelected }: RightSidebarProps) {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<'properties' | 'library'>('properties');

    return (
        <div className={`w-72 ${theme.panel} border-l ${theme.border} flex flex-col shrink-0 z-20`}>
            {/* TABS */}
            <div className={`flex border-b ${theme.border}`} role="tablist" aria-label="Sidebar panels">
                <button
                    onClick={() => setActiveTab('properties')}
                    role="tab"
                    aria-selected={activeTab === 'properties'}
                    aria-controls="panel-properties"
                    className={`flex-1 py-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors
                        ${activeTab === 'properties'
                            ? `border-b-2 border-red-500 ${theme.text}`
                            : `${theme.textMuted} hover:${theme.text}`
                        }`}
                >
                    <Settings size={16} />
                    {t('properties') || 'Properties'}
                </button>
                <button
                    onClick={() => setActiveTab('library')}
                    role="tab"
                    aria-selected={activeTab === 'library'}
                    aria-controls="panel-library"
                    className={`flex-1 py-3 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider transition-colors
                        ${activeTab === 'library'
                            ? `border-b-2 border-red-500 ${theme.text}`
                            : `${theme.textMuted} hover:${theme.text}`
                        }`}
                >
                    <Library size={16} />
                    {t('library') || 'Library'}
                </button>
            </div>

            {/* CONTENT */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {activeTab === 'properties' ? (
                    <div id="panel-properties" role="tabpanel" className="flex-1 flex flex-col overflow-hidden">
                        <PropertiesPanel
                            theme={theme}
                            selection={selection}
                            editor={editor}
                            applyLaserMode={applyLaserMode}
                            deleteSelected={deleteSelected}
                            isEmbedded={true}
                        />
                    </div>
                ) : (
                    <div id="panel-library" role="tabpanel" className="flex-1 flex flex-col overflow-hidden">
                        <AssetLibrary theme={theme} />
                    </div>
                )}
            </div>
        </div>
    );
}
