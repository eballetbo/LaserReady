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
    Star,
    Type
} from 'lucide-react';
import { Button } from '../../shared/ui';

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

interface ToolbarProps {
    tool: string;
    setTool: (tool: string) => void;
    theme: Theme;
    addText?: any; // Unused but kept for API compatibility
}

export default function Toolbar({ tool, setTool, theme }: ToolbarProps) {
    const { t } = useLanguage();

    // Submenu content for shapes
    const shapeSubmenu = (
        <>
            <button onClick={(e) => { e.stopPropagation(); setTool('rect'); }} className={`p-2 rounded ${theme.buttonHover} ${tool === 'rect' ? 'text-red-500' : theme.iconColor}`} title={t('rect')}>
                <Square size={20} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setTool('circle'); }} className={`p-2 rounded ${theme.buttonHover} ${tool === 'circle' ? 'text-red-500' : theme.iconColor}`} title={t('circle')}>
                <Circle size={20} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setTool('triangle'); }} className={`p-2 rounded ${theme.buttonHover} ${tool === 'triangle' ? 'text-red-500' : theme.iconColor}`} title={t('triangle')}>
                <Triangle size={20} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setTool('pentagon'); }} className={`p-2 rounded ${theme.buttonHover} ${tool === 'pentagon' ? 'text-red-500' : theme.iconColor}`} title={t('pentagon')}>
                <Pentagon size={20} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setTool('polygon'); }} className={`p-2 rounded ${theme.buttonHover} ${tool === 'polygon' ? 'text-red-500' : theme.iconColor}`} title={t('polygon')}>
                <Hexagon size={20} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); setTool('star'); }} className={`p-2 rounded ${theme.buttonHover} ${tool === 'star' ? 'text-red-500' : theme.iconColor}`} title={t('star')}>
                <Star size={20} />
            </button>
        </>
    );

    // Determine which icon to show for shape tool
    const getShapeIcon = () => {
        if (tool === 'circle') return Circle;
        if (tool === 'triangle') return Triangle;
        if (tool === 'pentagon') return Pentagon;
        if (tool === 'polygon') return Hexagon;
        if (tool === 'star') return Star;
        return Square;
    };

    return (
        <div className={`flex flex-col gap-2 p-2 ${theme.panel} border-r ${theme.border} h-full w-16 items-center shadow-sm z-10`}>
            <Button
                variant="icon"
                active={tool === 'select'}
                icon={MousePointer2}
                label={t('select')}
                onClick={() => setTool('select')}
                theme={theme}
            />
            <Button
                variant="icon"
                active={tool === 'node-edit'}
                icon={SplinePointer}
                label={t('nodeEdit')}
                onClick={() => setTool('node-edit')}
                theme={theme}
            />

            <div className="h-px w-6 bg-gray-200 my-1" />

            {/* Shape Tools with Submenu */}
            <Button
                variant="icon"
                active={['rect', 'circle', 'triangle', 'pentagon', 'polygon', 'star'].includes(tool)}
                icon={getShapeIcon()}
                label={t('shapes')}
                onClick={() => setTool(tool === 'select' ? 'rect' : tool)}
                theme={theme}
                hasSubmenu={true}
                submenuContent={shapeSubmenu}
            />

            <Button
                variant="icon"
                active={tool === 'pen'}
                icon={PenLine}
                label={t('penTool')}
                onClick={() => setTool('pen')}
                theme={theme}
            />
            <Button
                variant="icon"
                active={tool === 'text'}
                icon={Type}
                label={t('textTool')}
                onClick={() => setTool('text')}
                theme={theme}
            />
        </div>
    );
}
