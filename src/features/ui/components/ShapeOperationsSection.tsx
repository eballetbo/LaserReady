import { Trash2, Combine, Minus, SquaresIntersect, XCircle, Link, Unlink } from 'lucide-react';
import { useLanguage } from '../../../contexts/useLanguage';
import { ThemeColors } from '../../../config/themes';
import { CanvasController } from '../../editor/controller';
import { IShape } from '../../shapes/types';
import { Button } from './Button';
import { SectionHeader } from './SectionHeader';

interface ShapeOperationsSectionProps {
    theme: ThemeColors;
    editor: CanvasController | null;
    selectedObjects: IShape[];
    selectedObject: IShape | null | undefined;
    deleteSelected: () => void;
}

export function ShapeOperationsSection({
    theme,
    editor,
    selectedObjects,
    selectedObject,
    deleteSelected,
}: ShapeOperationsSectionProps) {
    const { t } = useLanguage();

    return (
        <div>
            <SectionHeader>{t('operations') || 'Operations'}</SectionHeader>
            <div className="space-y-4">
                {selectedObjects.length > 1 && (
                    <div className="grid grid-cols-2 gap-2">
                        <Button variant="iconText" onClick={() => editor?.performBooleanOperation('unite')} icon={Combine} label={t('unite')} theme={theme} />
                        <Button variant="iconText" onClick={() => editor?.performBooleanOperation('subtract')} icon={Minus} label={t('subtract')} theme={theme} />
                        <Button variant="iconText" onClick={() => editor?.performBooleanOperation('intersect')} icon={SquaresIntersect} label={t('intersect')} theme={theme} />
                        <Button variant="iconText" onClick={() => editor?.performBooleanOperation('exclude')} icon={XCircle} label={t('exclude')} theme={theme} />
                    </div>
                )}

                {(selectedObjects.length > 1 || (selectedObject && selectedObject.type === 'group')) && (
                    <div className="grid grid-cols-2 gap-2">
                        {selectedObjects.length > 1 && (
                            <Button variant="iconText" onClick={() => editor?.groupSelected()} icon={Link} label={t('Group') || 'Group'} theme={theme} />
                        )}
                        <Button variant="iconText" onClick={() => editor?.ungroupSelected()} icon={Unlink} label={t('Ungroup') || 'Ungroup'} theme={theme} />
                    </div>
                )}

                <div className="pt-2">
                    <Button
                        variant="iconText"
                        onClick={deleteSelected}
                        icon={Trash2}
                        label={`${t('delete')} (${selectedObjects.length})`}
                        theme={{ ...theme, buttonHover: 'hover:bg-red-500/10 hover:border-red-500 hover:text-red-500', iconColor: 'text-red-500' }}
                        className="w-full justify-center text-red-500 border-red-200 dark:border-red-900/30"
                    />
                </div>
            </div>
        </div>
    );
}
