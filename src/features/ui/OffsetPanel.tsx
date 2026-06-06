import { useLanguage } from '../../contexts/useLanguage';
import { useStore } from '../../store/useStore';
import { PIXELS_PER_MM } from '../../config/constants';
import { NumberInput, SectionHeader } from './components';
import { ThemeColors } from '../../config/themes';

interface OffsetPanelProps {
    theme: ThemeColors;
}

export const OffsetPanel = ({ theme }: OffsetPanelProps) => {
    const { t } = useLanguage();


    const offsetDistance = useStore(state => state.offsetDistance);
    const offsetJoin = useStore(state => state.offsetJoin);

    // Derived value for display (mm)
    const displayDistance = Number((offsetDistance / PIXELS_PER_MM).toFixed(2));

    return (
        <div className={`p-4 border border-blue-500/30 rounded-lg bg-blue-500/5 mb-4`}>
            <SectionHeader>{t('offsetPath') || 'Offset Path'}</SectionHeader>

            <div className="space-y-4">
                <div className="text-xs text-blue-500 mb-2">
                    Hover over a shape to preview, click to apply.
                </div>

                {/* Distance */}
                <div>
                    <NumberInput
                        label={t('distance') || 'Distance'}
                        value={displayDistance}
                        onChange={(v) => useStore.getState().setOffsetDistance(Number(v) * PIXELS_PER_MM)}
                        theme={theme}
                        step={1}
                    />
                    <div className="text-xs text-muted-foreground mt-1 ml-1">
                        {t('positiveOutward') || 'Positive: Outward, Negative: Inward'}
                    </div>
                </div>

                {/* Copies */}
                {/* Note: 'copies' state is local here but tool assumes true. 
                    If we want to support this toggle, we need to move it to store.
                    For now, I'll remove it or disable it, or move to store. 
                    User didn't strictly ask for it, but good UX.
                    I'll add it to store later if needed. For now, let's keep it simple.
                */}

                {/* Join Style */}
                <div>
                    <label className={`text-[10px] text-gray-400 block mb-1`}>{t('joinStyle') || 'Corner Style'}</label>
                    <select
                        value={offsetJoin}
                        onChange={(e) => useStore.getState().setOffsetJoin(e.target.value as 'round' | 'miter' | 'bevel')}
                        className={`w-full p-1.5 text-sm rounded border ${theme.inputBorder} ${theme.inputBg} ${theme.text}`}
                    >
                        <option value="round">{t('round') || 'Round'}</option>
                        <option value="miter">{t('sharp') || 'Sharp (Miter)'}</option>
                        <option value="bevel">{t('bevel') || 'Bevel'}</option>
                    </select>
                </div>
            </div>
        </div>
    );
};
