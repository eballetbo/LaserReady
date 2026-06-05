import React from 'react';
import {
    AlignLeft, AlignCenter, AlignRight,
    AlignStartVertical, AlignCenterVertical, AlignEndVertical,
    Bold, Italic, CaseSensitive, Merge
} from 'lucide-react';
import { NumberInput, SectionHeader } from './components';
import { CanvasController } from '../editor/controller';
import { ChangeTextStyleCommand } from '../shapes/commands/text';
import { ThemeColors } from '../../config/themes';
import { useLanguage } from '../../contexts/language';

type Theme = ThemeColors;

interface TextOptionsBarProps {
    selectedObject: any;
    editor: CanvasController | null;
    theme: Theme;
}

export const TextOptionsBar: React.FC<TextOptionsBarProps> = ({ selectedObject, editor, theme }) => {
    const { t } = useLanguage();

    const executeStyleChange = (prop: string, oldVal: unknown, newVal: unknown) => {
        if (!editor) return;
        const cmd = new ChangeTextStyleCommand(
            selectedObject.id,
            { [prop]: oldVal } as any,
            { [prop]: newVal } as any
        );
        editor.history.execute(cmd);
        editor.render();
    };

    const toggleButton = (
        label: string,
        icon: React.ReactNode,
        isActive: boolean,
        onClick: () => void
    ) => (
        <button
            onClick={onClick}
            className={`p-1.5 rounded border ${theme.border} ${isActive ? 'bg-blue-500/20 border-blue-500' : ''}`}
            title={label}
        >
            {icon}
        </button>
    );

    return (
        <div className="space-y-3">
            <SectionHeader>{t('textProperties')}</SectionHeader>

            {/* Spacing */}
            <div className="grid grid-cols-2 gap-2">
                <NumberInput
                    label="H Spacing %"
                    value={selectedObject.hSpace ?? 0}
                    onChange={(v) => {
                        const newVal = parseFloat(v);
                        if (isNaN(newVal)) return;
                        executeStyleChange('hSpace', selectedObject.hSpace, newVal);
                    }}
                    step={5}
                    theme={theme}
                />
                <NumberInput
                    label="V Spacing %"
                    value={selectedObject.vSpace ?? 0}
                    onChange={(v) => {
                        const newVal = parseFloat(v);
                        if (isNaN(newVal)) return;
                        executeStyleChange('vSpace', selectedObject.vSpace, newVal);
                    }}
                    step={5}
                    theme={theme}
                />
            </div>

            {/* Alignment */}
            <div>
                <label className="text-[10px] text-gray-400 block mb-1">Alignment</label>
                <div className="flex gap-1">
                    {toggleButton('Left', <AlignLeft size={14} />, selectedObject.alignX === 'left',
                        () => executeStyleChange('alignX', selectedObject.alignX, 'left'))}
                    {toggleButton('Center', <AlignCenter size={14} />, selectedObject.alignX === 'center',
                        () => executeStyleChange('alignX', selectedObject.alignX, 'center'))}
                    {toggleButton('Right', <AlignRight size={14} />, selectedObject.alignX === 'right',
                        () => executeStyleChange('alignX', selectedObject.alignX, 'right'))}

                    <div className="w-px bg-gray-600 mx-1" />

                    {toggleButton('Top', <AlignStartVertical size={14} />, selectedObject.alignY === 'top',
                        () => executeStyleChange('alignY', selectedObject.alignY, 'top'))}
                    {toggleButton('Middle', <AlignCenterVertical size={14} />, selectedObject.alignY === 'middle',
                        () => executeStyleChange('alignY', selectedObject.alignY, 'middle'))}
                    {toggleButton('Bottom', <AlignEndVertical size={14} />, selectedObject.alignY === 'bottom',
                        () => executeStyleChange('alignY', selectedObject.alignY, 'bottom'))}
                </div>
            </div>

            {/* Style toggles */}
            <div>
                <label className="text-[10px] text-gray-400 block mb-1">Style</label>
                <div className="flex gap-1">
                    {toggleButton('Bold', <Bold size={14} />, selectedObject.fontWeight === 'bold',
                        () => executeStyleChange('fontWeight', selectedObject.fontWeight,
                            selectedObject.fontWeight === 'bold' ? 'normal' : 'bold'))}
                    {toggleButton('Italic', <Italic size={14} />, selectedObject.fontStyle === 'italic',
                        () => executeStyleChange('fontStyle', selectedObject.fontStyle,
                            selectedObject.fontStyle === 'italic' ? 'normal' : 'italic'))}
                    {toggleButton('Upper Case', <CaseSensitive size={14} />, selectedObject.upperCase === true,
                        () => executeStyleChange('upperCase', selectedObject.upperCase, !selectedObject.upperCase))}
                    {toggleButton('Auto-Weld', <Merge size={14} />, selectedObject.weld === true,
                        () => executeStyleChange('weld', selectedObject.weld, !selectedObject.weld))}
                </div>
            </div>

            {/* Bend */}
            <NumberInput
                label="Bend"
                value={selectedObject.bend ?? 0}
                onChange={(v) => {
                    const newVal = parseFloat(v);
                    if (isNaN(newVal)) return;
                    executeStyleChange('bend', selectedObject.bend, newVal);
                }}
                min={-180}
                max={180}
                step={5}
                theme={theme}
            />
        </div>
    );
};
