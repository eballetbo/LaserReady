import React from 'react';
import { useLanguage } from '../../contexts/language';
import {
    MousePointer2,
    Square,
    Circle,
    Hexagon,
    Triangle,
    Pentagon,
    PenLine,
    SplinePointer,
    ChevronRight,
    Star,
    Type,
    LucideIcon
} from 'lucide-react';

interface Theme {
    iconColor: string;
    buttonHover: string;
    border: string;
    panel: string;
    text?: string;
    textMuted?: string;
    inputBg?: string;
    inputBorder?: string;
    [key: string]: string | undefined;
}

interface ToolButtonProps {
    active: boolean;
    icon: LucideIcon;
    label: string;
    onClick: () => void;
    theme: Theme;
    hasSubmenu?: boolean;
    onSubmenuClick?: React.ReactNode;
}

const ToolButton: React.FC<ToolButtonProps> = ({ active, icon: Icon, label, onClick, theme, hasSubmenu, onSubmenuClick }) => (
    <div className="relative group/btn">
        <button
            onClick={onClick}
            title={label}
            className={`w-12 h-12 mb-2 rounded-lg transition-all flex justify-center items-center relative
      ${active
                    ? 'bg-red-600 text-white shadow-lg shadow-red-500/30'
                    : `${theme.iconColor} ${theme.buttonHover} hover:text-red-500`
                } `}
        >
            <Icon size={24} />
            {hasSubmenu && (
                <div className="absolute bottom-1 right-1">
                    <div className="w-0 h-0 border-l-[4px] border-l-transparent border-t-[4px] border-t-current border-r-[4px] border-r-transparent transform rotate-[-45deg]" />
                </div>
            )}
        </button>
        {hasSubmenu && (
            <div className="absolute left-full top-0 pl-2 hidden group-hover/btn:flex z-50">
                <div className={`p-2 rounded-lg shadow-xl border ${theme.border} ${theme.panel} flex flex-col gap-2 min-w-[60px]`}>
                    {onSubmenuClick}
                </div>
            </div>
        )}
    </div>
);

interface ToolbarProps {
    tool: string;
    setTool: (tool: string) => void;
    theme: Theme;
    addText?: any; // Unused but kept for API compatibility
}

export default function Toolbar({ tool, setTool, theme, addText }: ToolbarProps) {
    const { t } = useLanguage();
    return (
        <div className={`flex flex-col gap-2 p-2 ${theme.panel} border-r ${theme.border} h-full w-16 items-center shadow-sm z-10`}>
            <ToolButton active={tool === 'select'} icon={MousePointer2} label={t('select')} onClick={() => setTool('select')} theme={theme} />
            <ToolButton active={tool === 'node-edit'} icon={SplinePointer} label={t('nodeEdit')} onClick={() => setTool('node-edit')} theme={theme} />

            <div className="h-px w-6 bg-gray-200 my-1" />

            {/* Shape Tools Submenu */}
            <ToolButton
                active={['rect', 'circle', 'triangle', 'pentagon', 'polygon', 'star'].includes(tool)}
                icon={
                    tool === 'circle' ? Circle :
                        tool === 'triangle' ? Triangle :
                            tool === 'pentagon' ? Pentagon :
                                tool === 'polygon' ? Hexagon :
                                    tool === 'star' ? Star :
                                        Square // Default to Square
                }
                label={t('shapes')}
                onClick={() => setTool(tool === 'select' ? 'rect' : tool)}
                theme={theme}
                hasSubmenu={true}
                onSubmenuClick={
                    <>
                        <button onClick={(e) => { e.stopPropagation(); setTool('rect'); }} className={`p-2 rounded ${theme.buttonHover} ${tool === 'rect' ? 'text-red-500' : theme.iconColor}`} title={t('rect')}><Square size={20} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setTool('circle'); }} className={`p-2 rounded ${theme.buttonHover} ${tool === 'circle' ? 'text-red-500' : theme.iconColor}`} title={t('circle')}><Circle size={20} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setTool('triangle'); }} className={`p-2 rounded ${theme.buttonHover} ${tool === 'triangle' ? 'text-red-500' : theme.iconColor}`} title={t('triangle')}><Triangle size={20} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setTool('pentagon'); }} className={`p-2 rounded ${theme.buttonHover} ${tool === 'pentagon' ? 'text-red-500' : theme.iconColor}`} title={t('pentagon')}><Pentagon size={20} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setTool('polygon'); }} className={`p-2 rounded ${theme.buttonHover} ${tool === 'polygon' ? 'text-red-500' : theme.iconColor}`} title={t('polygon')}><Hexagon size={20} /></button>
                        <button onClick={(e) => { e.stopPropagation(); setTool('star'); }} className={`p-2 rounded ${theme.buttonHover} ${tool === 'star' ? 'text-red-500' : theme.iconColor}`} title={t('star')}><Star size={20} /></button>
                    </>
                }
            />
            <ToolButton active={tool === 'pen'} icon={PenLine} label={t('penTool')} onClick={() => setTool('pen')} theme={theme} />
            <ToolButton active={tool === 'text'} icon={Type} label={t('textTool')} onClick={() => setTool('text')} theme={theme} />
        </div>
    );
}
