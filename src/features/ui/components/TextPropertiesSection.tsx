import { Combine } from 'lucide-react';
import { useLanguage } from '../../../contexts/useLanguage';
import { AVAILABLE_FONTS } from '../../../config/constants';
import { ThemeColors } from '../../../config/themes';
import { CanvasController } from '../../editor/controller';
import { TextObject } from '../../shapes/models/text';
import { ChangeTextStyleCommand } from '../../shapes/commands/text';
import { ConvertToPathCommand, loadFontForConversion } from '../../shapes/commands/convert-to-path';
import { TextOptionsBar } from '../TextOptionsBar';
import { Button } from './Button';
import { NumberInput } from './NumberInput';

interface TextPropertiesSectionProps {
    theme: ThemeColors;
    editor: CanvasController | null;
    selectedObject: TextObject;
}

export function TextPropertiesSection({ theme, editor, selectedObject }: TextPropertiesSectionProps) {
    const { t } = useLanguage();
    const categories = [...new Set(AVAILABLE_FONTS.map(f => f.category))];

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label htmlFor="font-family-select" className="text-[10px] text-gray-400 block mb-1">
                        {t('fontFamily')}
                    </label>
                    <select
                        id="font-family-select"
                        aria-label={t('fontFamily')}
                        value={selectedObject.fontFamily}
                        onChange={(e) => {
                            if (!editor) return;
                            const oldVal = selectedObject.fontFamily;
                            const cmd = new ChangeTextStyleCommand(
                                selectedObject.id,
                                { fontFamily: oldVal },
                                { fontFamily: e.target.value }
                            );
                            editor.history.execute(cmd);
                            editor.render();
                        }}
                        className={`w-full p-1.5 text-sm rounded border ${theme.inputBorder} ${theme.inputBg} ${theme.text}`}
                    >
                        {categories.map(cat => (
                            <optgroup key={cat} label={cat}>
                                {AVAILABLE_FONTS.filter(f => f.category === cat).map(f => (
                                    <option key={f.name} value={f.name} style={{ fontFamily: f.name }}>
                                        {f.name}
                                    </option>
                                ))}
                            </optgroup>
                        ))}
                    </select>
                </div>
                <NumberInput
                    label={t('fontSize')}
                    value={selectedObject.fontSize}
                    onChange={(v) => {
                        if (!editor) return;
                        const oldVal = selectedObject.fontSize;
                        const newVal = parseFloat(v);
                        if (isNaN(newVal) || newVal <= 0) return;
                        const cmd = new ChangeTextStyleCommand(
                            selectedObject.id,
                            { fontSize: oldVal },
                            { fontSize: newVal }
                        );
                        editor.history.execute(cmd);
                        editor.render();
                    }}
                    theme={theme}
                />
            </div>
            <TextOptionsBar selectedObject={selectedObject} editor={editor} theme={theme} />
            <div className="mt-2">
                <Button
                    variant="primary"
                    onClick={async () => {
                        if (!editor) return;
                        const font = await loadFontForConversion(selectedObject.fontFamily || 'Roboto');
                        if (!font) return;
                        editor.history.execute(new ConvertToPathCommand(selectedObject, font));
                    }}
                    icon={Combine}
                    label={t('convertToPath')}
                    theme={theme}
                    className="w-full"
                />
            </div>
        </div>
    );
}
