import React, { useState } from 'react';
import { Settings, Library } from 'lucide-react';
import { useLanguage } from '../contexts/language';
import PropertiesPanel from './properties';
import AssetLibrary from './asset-library';

export default function RightSidebar({ theme, selection, editor, applyLaserMode, deleteSelected }) {
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState('properties');

    return (
        <div className={`w-72 ${theme.panel} border-l ${theme.border} flex flex-col shrink-0 z-20`}>
            {/* TABS */}
            <div className={`flex border-b ${theme.border}`}>
                <button
                    onClick={() => setActiveTab('properties')}
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
                    <PropertiesPanel
                        theme={theme}
                        selection={selection}
                        editor={editor}
                        applyLaserMode={applyLaserMode}
                        deleteSelected={deleteSelected}
                        isEmbedded={true} // Prop to tell PropertiesPanel it's inside a container
                    />
                ) : (
                    <AssetLibrary theme={theme} />
                )}
            </div>
        </div>
    );
}
