import { useState } from 'react';
import {
    AlignStartHorizontal,
    AlignCenterHorizontal,
    AlignEndHorizontal,
    AlignStartVertical,
    AlignCenterVertical,
    AlignEndVertical,
    AlignHorizontalDistributeCenter,
    AlignVerticalDistributeCenter,
} from 'lucide-react';
import { useLanguage } from '../../../contexts/useLanguage';
import { ThemeColors } from '../../../config/themes';
import { CanvasController } from '../../editor/controller';
import { AlignCommand } from '../../shapes/commands/align';
import { DistributeCommand } from '../../shapes/commands/distribute';
import { AlignType } from '../../shapes/types';
import { Button } from './Button';
import { SectionHeader } from './SectionHeader';

interface AlignDistributeSectionProps {
    theme: ThemeColors;
    editor: CanvasController | null;
    selectedIds: string[];
}

export function AlignDistributeSection({ theme, editor, selectedIds }: AlignDistributeSectionProps) {
    const { t } = useLanguage();
    const [alignToPage, setAlignToPage] = useState(false);

    const align = (type: AlignType) => {
        if (!editor || selectedIds.length === 0) return;
        editor.history.execute(new AlignCommand(selectedIds, type, alignToPage ? 'page' : 'selection'));
        editor.render();
    };

    const distribute = (axis: 'horizontal' | 'vertical') => {
        if (!editor || selectedIds.length <= 2) return;
        editor.history.execute(new DistributeCommand(selectedIds, axis));
        editor.render();
    };

    const canDistribute = selectedIds.length >= 3;

    return (
        <div>
            <SectionHeader>{t('align') || 'Align and Distribute'}</SectionHeader>
            <div className="space-y-2">
                <div className="grid grid-cols-4 gap-2">
                    <Button variant="icon" icon={AlignStartVertical} onClick={() => align('left')} theme={theme} title="Align Left" label="Align Left" />
                    <Button variant="icon" icon={AlignCenterVertical} onClick={() => align('center-v')} theme={theme} title="Align Center Vertically" label="Align Center Vertically" />
                    <Button variant="icon" icon={AlignEndVertical} onClick={() => align('right')} theme={theme} title="Align Right" label="Align Right" />
                    <Button variant="icon" icon={AlignHorizontalDistributeCenter} onClick={() => distribute('horizontal')} theme={theme} disabled={!canDistribute} title="Distribute Horizontally" label="Distribute Horizontally" />
                    <Button variant="icon" icon={AlignStartHorizontal} onClick={() => align('top')} theme={theme} title="Align Top" label="Align Top" />
                    <Button variant="icon" icon={AlignCenterHorizontal} onClick={() => align('center-h')} theme={theme} title="Align Center Horizontal" label="Align Center Horizontal" />
                    <Button variant="icon" icon={AlignEndHorizontal} onClick={() => align('bottom')} theme={theme} title="Align Bottom" label="Align Bottom" />
                    <Button variant="icon" icon={AlignVerticalDistributeCenter} onClick={() => distribute('vertical')} theme={theme} disabled={!canDistribute} title="Distribute Vertically" label="Distribute Vertically" />
                </div>
                <div className="flex items-center gap-2 text-xs">
                    <input
                        id="align-to-page-checkbox"
                        type="checkbox"
                        checked={alignToPage}
                        onChange={(e) => setAlignToPage(e.target.checked)}
                        className="rounded border-gray-300"
                        aria-label={t('alignToPage') || 'Align to Page'}
                    />
                    <label htmlFor="align-to-page-checkbox">{t('alignToPage') || 'Align to Page'}</label>
                </div>
            </div>
        </div>
    );
}
