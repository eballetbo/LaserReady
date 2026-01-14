import { useState } from 'react';
import { useLanguage } from '../../contexts/language';
import { Button, NumberInput, SectionHeader } from '../../shared/ui';
import { OffsetOptions } from '../shapes/commands/offset';
import { Check, X } from 'lucide-react';

interface OffsetPanelProps {
    theme: any;
    onApply: (distance: number, options: OffsetOptions) => void;
    onCancel: () => void;
}

export const OffsetPanel = ({ theme, onApply, onCancel }: OffsetPanelProps) => {
    const { t } = useLanguage();
    const [distance, setDistance] = useState(5);
    const [copies, setCopies] = useState(true);
    const [join, setJoin] = useState<OffsetOptions['join']>('round');

    return (
        <div className={`p-4 border border-blue-500/30 rounded-lg bg-blue-500/5 mb-4`}>
            <SectionHeader>{t('offsetPath') || 'Offset Path'}</SectionHeader>

            <div className="space-y-4">
                {/* Distance */}
                <div>
                    <NumberInput
                        label={t('distance') || 'Distance'}
                        value={distance}
                        onChange={(v) => setDistance(parseFloat(v))}
                        theme={theme}
                        step={1}
                    />
                    <div className="text-xs text-muted-foreground mt-1 ml-1">
                        {t('positiveOutward') || 'Positive: Outward, Negative: Inward'}
                    </div>
                </div>

                {/* Copies */}
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={copies}
                        onChange={(e) => setCopies(e.target.checked)}
                        className={`rounded ${theme.border}`}
                        id="offset-copies"
                    />
                    <label htmlFor="offset-copies" className={`text-sm ${theme.text}`}>
                        {t('createCopies') || 'Create Copies'}
                    </label>
                </div>

                {/* Join Style */}
                <div>
                    <label className={`text-[10px] text-gray-400 block mb-1`}>{t('joinStyle') || 'Corner Style'}</label>
                    <select
                        value={join}
                        onChange={(e) => setJoin(e.target.value as any)}
                        className={`w-full p-1.5 text-sm rounded border ${theme.inputBorder} ${theme.inputBg} ${theme.text}`}
                    >
                        <option value="round">{t('round') || 'Round'}</option>
                        <option value="miter">{t('sharp') || 'Sharp (Miter)'}</option>
                        <option value="bevel">{t('bevel') || 'Bevel'}</option>
                    </select>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    <Button
                        variant="primary" // Assuming primary exists, or use default
                        onClick={() => onApply(distance, { distance, copies, join })}
                        icon={Check}
                        label={t('apply') || 'Apply'}
                        theme={theme}
                        className="flex-1"
                    />
                    <Button
                        variant="iconText"
                        onClick={onCancel}
                        icon={X}
                        label={t('cancel') || 'Cancel'}
                        theme={theme}
                        className="flex-1"
                    />
                </div>
            </div>
        </div>
    );
};
