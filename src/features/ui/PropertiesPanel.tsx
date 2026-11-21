import { useState, useMemo } from 'react';
import { useStore } from '../../store/useStore';
import { useLanguage } from '../../contexts/useLanguage';
import { CanvasController } from '../editor/controller';
import {
    NumberInput,
    SectionHeader,
    NodeOperationsSection,
    AlignDistributeSection,
    TextPropertiesSection,
    ShapeOperationsSection,
} from './components';
import { OffsetPanel } from './OffsetPanel';
import { TransformCommand } from '../shapes/commands/transform';
import { UpdateParamsCommand } from '../shapes/commands/update-params';
import { PIXELS_PER_MM } from '../../config/constants';
import { Geometry } from '../../core/math/geometry';
import { ThemeColors } from '../../config/themes';
import { TextObject } from '../shapes/models/text';

interface PropertiesPanelProps {
    theme: ThemeColors;
    editor: CanvasController | null;
    applyLaserMode: (mode: string) => void;
    deleteSelected: () => void;
    isEmbedded: boolean;
}

export default function PropertiesPanel({ theme, editor, applyLaserMode, deleteSelected, isEmbedded }: PropertiesPanelProps) {
    const { t } = useLanguage();
    const [editingDims, setEditingDims] = useState<Partial<Record<'x' | 'y' | 'w' | 'h', string>>>({});

    const tool = useStore(state => state.tool);
    const filletRadius = useStore(state => state.filletRadius || 5);
    const shapes = useStore(state => state.shapes);
    const selectedIds = useStore(state => state.selectedShapes);

    const selectedObjects = shapes.filter(s => selectedIds.includes(s.id));
    const selectedObject = selectedObjects.length === 1 ? selectedObjects[0] : null;
    const hasSelection = selectedObjects.length > 0;

    const sides = (selectedObject?.params?.sides as number | undefined) ?? 6;
    const points = (selectedObject?.params?.points as number | undefined) ?? 5;
    const innerRadius = (selectedObject?.params?.innerRadius as number | undefined) ?? 0.382;

    const storeDimensions = useMemo(() => {
        if (!hasSelection) return { x: '0', y: '0', w: '0', h: '0' };

        const bounds = selectedObjects.length > 1
            ? Geometry.getCombinedBounds(selectedObjects)
            : (selectedObjects[0]?.getBounds ? selectedObjects[0].getBounds() : null);

        const b = bounds ?? { minX: 0, minY: 0, width: 0, height: 0 };
        return {
            x: (b.minX / PIXELS_PER_MM).toFixed(2),
            y: (b.minY / PIXELS_PER_MM).toFixed(2),
            w: (b.width / PIXELS_PER_MM).toFixed(2),
            h: (b.height / PIXELS_PER_MM).toFixed(2),
        };
    }, [hasSelection, selectedObjects]);

    const dimensions = {
        x: editingDims.x ?? storeDimensions.x,
        y: editingDims.y ?? storeDimensions.y,
        w: editingDims.w ?? storeDimensions.w,
        h: editingDims.h ?? storeDimensions.h,
    };

    const updateDimension = (key: 'x' | 'y' | 'w' | 'h', value: string) => {
        setEditingDims(prev => ({ ...prev, [key]: value }));
    };

    const commitDimension = (key: 'x' | 'y' | 'w' | 'h') => {
        const raw = editingDims[key];
        setEditingDims(prev => {
            const next = { ...prev };
            delete next[key];
            return next;
        });

        if (raw === undefined || !hasSelection || !editor) return;

        const val = parseFloat(raw);
        if (isNaN(val)) return;

        const bounds = (selectedObjects.length > 1
            ? Geometry.getCombinedBounds(selectedObjects)
            : (selectedObjects[0]?.getBounds ? selectedObjects[0].getBounds() : null))
            ?? { minX: 0, minY: 0, width: 0, height: 0 };

        const valPx = val * PIXELS_PER_MM;

        const command = new TransformCommand(selectedObjects, (targetShapes) => {
            if (key === 'x') {
                const dx = valPx - bounds.minX;
                targetShapes.forEach(obj => obj.move?.(dx, 0));
            } else if (key === 'y') {
                const dy = valPx - bounds.minY;
                targetShapes.forEach(obj => obj.move?.(0, dy));
            } else if (key === 'w') {
                if (bounds.width === 0) return;
                const sx = valPx / bounds.width;
                targetShapes.forEach(obj => obj.scale?.(sx, 1, { x: bounds.minX, y: bounds.minY }));
            } else if (key === 'h') {
                if (bounds.height === 0) return;
                const sy = valPx / bounds.height;
                targetShapes.forEach(obj => obj.scale?.(1, sy, { x: bounds.minX, y: bounds.minY }));
            }
        });

        editor.history.execute(command);
        editor.render();
    };

    const handleKeyDown = (e: React.KeyboardEvent, key: 'x' | 'y' | 'w' | 'h') => {
        if (e.key === 'Enter') {
            commitDimension(key);
            (e.target as HTMLInputElement).blur();
        }
    };

    const updateParam = (key: string, value: string) => {
        const val = parseFloat(value);

        if (!selectedObject || !selectedObject.params || !editor) return;

        if (isNaN(val)) return;
        if (key === 'sides' && val < 3) return;
        if (key === 'points' && val < 3) return;
        if (key === 'innerRadius' && (val <= 0 || val >= 1)) return;

        const oldValue = (selectedObject.params[key] as number) ?? val;
        const command = new UpdateParamsCommand(selectedObject.id, key, oldValue, val);
        editor.history.execute(command);
        editor.render();
    };

    return (
        <div className={`flex flex-col shrink-0 z-20 p-4 ${isEmbedded ? 'w-full' : `w-72 ${theme.panel} border-l ${theme.border}`}`}>
            {tool === 'fillet' && (
                <div className="mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
                    <SectionHeader>{t('filletSettings') || 'Fillet Settings'}</SectionHeader>
                    <div className="flex gap-2 items-center">
                        <NumberInput
                            label={t('radius') || 'Radius'}
                            value={Number((filletRadius / PIXELS_PER_MM).toFixed(2))}
                            onChange={(v) => useStore.getState().setFilletRadius(Number(v) * PIXELS_PER_MM)}
                            theme={theme}
                            min={0}
                            step={1}
                        />
                        <span className="text-xs text-muted-foreground ml-2">mm</span>
                    </div>
                </div>
            )}

            {tool === 'offset' && <OffsetPanel theme={theme} />}

            {hasSelection ? (
                <div className="space-y-6">
                    {tool !== 'node-edit' && (
                        <div>
                            <SectionHeader>{t('dimensions (mm)')}</SectionHeader>
                            <div className="grid grid-cols-2 gap-2">
                                <NumberInput label="X" value={dimensions.x} onChange={(v) => updateDimension('x', v)} onBlur={() => commitDimension('x')} onKeyDown={(e) => handleKeyDown(e, 'x')} theme={theme} />
                                <NumberInput label="Y" value={dimensions.y} onChange={(v) => updateDimension('y', v)} onBlur={() => commitDimension('y')} onKeyDown={(e) => handleKeyDown(e, 'y')} theme={theme} />
                                <NumberInput label={`${t('width')}`} value={dimensions.w} onChange={(v) => updateDimension('w', v)} onBlur={() => commitDimension('w')} onKeyDown={(e) => handleKeyDown(e, 'w')} theme={theme} />
                                <NumberInput label={`${t('height')}`} value={dimensions.h} onChange={(v) => updateDimension('h', v)} onBlur={() => commitDimension('h')} onKeyDown={(e) => handleKeyDown(e, 'h')} theme={theme} />
                            </div>
                        </div>
                    )}

                    {selectedObject && selectedObject.type === 'polygon' && (
                        <div>
                            <SectionHeader>{t('shapeProperties')}</SectionHeader>
                            <NumberInput label={t('sides')} value={sides} onChange={(v) => updateParam('sides', v)} min={3} max={12} theme={theme} />
                        </div>
                    )}

                    {selectedObject instanceof TextObject && (
                        <TextPropertiesSection theme={theme} editor={editor} selectedObject={selectedObject} />
                    )}

                    {selectedObject && selectedObject.type === 'star' && (
                        <div>
                            <SectionHeader>{t('shapeProperties')}</SectionHeader>
                            <div className="grid grid-cols-2 gap-2">
                                <NumberInput label={t('points')} value={points} onChange={(v) => updateParam('points', v)} min={3} max={20} theme={theme} />
                                <NumberInput label={t('innerRadius')} value={innerRadius} onChange={(v) => updateParam('innerRadius', v)} min={0.1} max={0.9} step={0.05} theme={theme} />
                            </div>
                        </div>
                    )}

                    {tool !== 'node-edit' && (
                        <div>
                            <SectionHeader>{t('laserMode')}</SectionHeader>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => applyLaserMode('CUT')}
                                    className={`p-2 rounded border ${theme.border} hover:bg-red-500/10 hover:border-red-500 flex flex-col items-center justify-center gap-1 h-16`}
                                    title={`${t('cut')} - Red Stroke`}
                                    aria-label={t('cut')}
                                >
                                    <div className="w-4 h-4 bg-red-500 rounded-full" />
                                    <span className="text-xs font-bold">{t('cut')}</span>
                                </button>
                                <button
                                    onClick={() => applyLaserMode('SCORE')}
                                    className={`p-2 rounded border ${theme.border} hover:bg-blue-500/10 hover:border-blue-500 flex flex-col items-center justify-center gap-1 h-16`}
                                    title={`${t('score')} - Blue Stroke`}
                                    aria-label={t('score')}
                                >
                                    <div className="w-4 h-4 bg-blue-500 rounded-full" />
                                    <span className="text-xs font-bold">{t('score')}</span>
                                </button>
                                <button
                                    onClick={() => applyLaserMode('ENGRAVE')}
                                    className={`p-2 rounded border ${theme.border} hover:bg-gray-500/10 hover:border-gray-500 flex flex-col items-center justify-center gap-1 h-16`}
                                    title={`${t('engrave')} - Black Fill`}
                                    aria-label={t('engrave')}
                                >
                                    <div className="w-4 h-4 bg-black rounded-full" />
                                    <span className="text-xs font-bold">{t('engrave')}</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {tool === 'node-edit' && selectedObject && (
                        <NodeOperationsSection theme={theme} editor={editor} shapeId={selectedObject.id} />
                    )}

                    {tool !== 'node-edit' && (
                        <>
                            <AlignDistributeSection theme={theme} editor={editor} selectedIds={selectedObjects.map(s => s.id)} />
                            <ShapeOperationsSection
                                theme={theme}
                                editor={editor}
                                selectedObjects={selectedObjects}
                                selectedObject={selectedObject}
                                deleteSelected={deleteSelected}
                            />
                        </>
                    )}
                </div>
            ) : (
                <div className="text-center text-gray-500 mt-10 text-sm">
                    {t('noSelection')}
                </div>
            )}
        </div>
    );
}
