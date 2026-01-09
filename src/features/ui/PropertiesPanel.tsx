import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/language';
import { Trash2, Combine, Minus, SquaresIntersect, XCircle, Link, Unlink } from 'lucide-react';
import { CanvasController } from '../editor/controller';
import { Button, NumberInput, SectionHeader } from '../../shared/ui';
import { ConvertToPathCommand } from '../shapes/commands/convert-to-path';
import { PIXELS_PER_MM } from '../../config/constants';

interface Theme {
    iconColor: string;
    buttonHover: string;
    border: string;
    panel: string;
    text: string;
    textMuted: string;
    inputBg?: string;
    inputBorder?: string;
    [key: string]: string | undefined;
}

interface PropertiesPanelProps {
    theme: Theme;
    selection: any[]; // PathShape[] | TextObject[]
    editor: CanvasController | null;
    applyLaserMode: (mode: string) => void;
    deleteSelected: () => void;
    isEmbedded: boolean;
}

export default function PropertiesPanel({ theme, selection, editor, applyLaserMode, deleteSelected, isEmbedded }: PropertiesPanelProps) {
    const { t } = useLanguage();
    const [dimensions, setDimensions] = useState<{ x: number | string, y: number | string, w: number | string, h: number | string }>({ x: 0, y: 0, w: 0, h: 0 });
    const [sides, setSides] = useState(6);
    const [points, setPoints] = useState(5);
    const [innerRadius, setInnerRadius] = useState(0.382);

    const selectedObject = selection.length === 1 ? selection[0] : null;

    useEffect(() => {
        if (selectedObject) {
            const updateDims = () => {
                const bounds = selectedObject.getBounds ? selectedObject.getBounds() : { minX: 0, minY: 0, width: 0, height: 0 };
                setDimensions({
                    x: (bounds.minX / PIXELS_PER_MM).toFixed(2),
                    y: (bounds.minY / PIXELS_PER_MM).toFixed(2),
                    w: (bounds.width / PIXELS_PER_MM).toFixed(2),
                    h: (bounds.height / PIXELS_PER_MM).toFixed(2)
                });
            };
            updateDims();
            if (selectedObject.params?.sides) {
                setSides(selectedObject.params.sides);
            }
            if (selectedObject.params?.points) {
                setPoints(selectedObject.params.points);
            }
            if (selectedObject.params?.innerRadius) {
                setInnerRadius(selectedObject.params.innerRadius);
            }
        }
    }, [selectedObject, selection]);

    const updateDimension = (key: string, value: string) => {
        setDimensions(prev => ({ ...prev, [key]: value }));
    };

    const commitDimension = (key: string) => {
        if (!selectedObject || !editor) return;

        const value = dimensions[key as keyof typeof dimensions];
        const val = parseFloat(value as string);
        if (isNaN(val)) return;

        const bounds = selectedObject.getBounds ? selectedObject.getBounds() : { minX: 0, minY: 0, width: 0, height: 0 };

        editor.startAction();

        // Convert Input Millimeters -> Internal Pixels
        const valPx = val * PIXELS_PER_MM;

        if (key === 'x') {
            const dx = valPx - bounds.minX;
            selectedObject.move(dx, 0);
        } else if (key === 'y') {
            const dy = valPx - bounds.minY;
            selectedObject.move(0, dy);
        } else if (key === 'w') {
            if (bounds.width === 0) return;
            // scale factor is ratio of new pixels / old pixels
            const sx = valPx / bounds.width;
            selectedObject.scale(sx, 1, { x: bounds.minX, y: bounds.minY });
        } else if (key === 'h') {
            if (bounds.height === 0) return;
            const sy = valPx / bounds.height;
            selectedObject.scale(1, sy, { x: bounds.minX, y: bounds.minY });
        }

        editor.render();
        editor.endAction();
    };

    const handleKeyDown = (e: React.KeyboardEvent, key: string) => {
        if (e.key === 'Enter') {
            commitDimension(key);
            (e.target as HTMLInputElement).blur();
        }
    };

    const updateParam = (key: string, value: string) => {
        let val = parseFloat(value);

        if (key === 'sides') setSides(val);
        if (key === 'points') setPoints(val);
        if (key === 'innerRadius') setInnerRadius(val);

        if (!selectedObject || !selectedObject.params || !editor) return;

        if (isNaN(val)) return;
        if (key === 'sides' && val < 3) return;
        if (key === 'points' && val < 3) return;
        if (key === 'innerRadius' && (val <= 0 || val >= 1)) return;

        selectedObject.params[key] = val;
        editor.updateShape(selectedObject);
    };

    return (
        <div className={`flex flex-col shrink-0 z-20 p-4 ${isEmbedded ? 'w-full' : `w-72 ${theme.panel} border-l ${theme.border}`}`}>
            {selection.length > 1 ? (
                <div className="space-y-6">
                    <div>
                        <SectionHeader>{t('booleanOperations')}</SectionHeader>
                        <div className="grid grid-cols-2 gap-2 mb-6">
                            <Button variant="iconText" onClick={() => editor?.groupSelected()} icon={Link} label={t('group') || 'Group'} theme={theme} />
                            <Button variant="iconText" onClick={() => editor?.ungroupSelected()} icon={Unlink} label={t('ungroup') || 'Ungroup'} theme={theme} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Button variant="iconText" onClick={() => editor?.performBooleanOperation('unite')} icon={Combine} label={t('unite')} theme={theme} />
                            <Button variant="iconText" onClick={() => editor?.performBooleanOperation('subtract')} icon={Minus} label={t('subtract')} theme={theme} />
                            <Button variant="iconText" onClick={() => editor?.performBooleanOperation('intersect')} icon={SquaresIntersect} label={t('intersect')} theme={theme} />
                            <Button variant="iconText" onClick={() => editor?.performBooleanOperation('exclude')} icon={XCircle} label={t('exclude')} theme={theme} />
                        </div>
                    </div>
                    <Button variant="primary" onClick={deleteSelected} icon={Trash2} label={`${t('delete')} (${selection.length})`} theme={theme} className="mt-4" />
                </div>
            ) : selectedObject ? (
                <div className="space-y-6">
                    {/* DIMENSIONS */}
                    <div>
                        <SectionHeader>{t('dimensions (mm)')}</SectionHeader>
                        <div className="grid grid-cols-2 gap-2">
                            <NumberInput
                                label="X"
                                value={dimensions.x}
                                onChange={(v) => updateDimension('x', v)}
                                onBlur={() => commitDimension('x')}
                                onKeyDown={(e) => handleKeyDown(e, 'x')}
                                theme={theme}
                            />
                            <NumberInput
                                label="Y"
                                value={dimensions.y}
                                onChange={(v) => updateDimension('y', v)}
                                onBlur={() => commitDimension('y')}
                                onKeyDown={(e) => handleKeyDown(e, 'y')}
                                theme={theme}
                            />
                            <NumberInput
                                label={`${t('width')}`}
                                value={dimensions.w}
                                onChange={(v) => updateDimension('w', v)}
                                onBlur={() => commitDimension('w')}
                                onKeyDown={(e) => handleKeyDown(e, 'w')}
                                theme={theme}
                            />
                            <NumberInput
                                label={`${t('height')}`}
                                value={dimensions.h}
                                onChange={(v) => updateDimension('h', v)}
                                onBlur={() => commitDimension('h')}
                                onKeyDown={(e) => handleKeyDown(e, 'h')}
                                theme={theme}
                            />
                        </div>
                    </div>

                    {selectedObject.type === 'group' && (
                        <div>
                            <SectionHeader>{t('grouping') || 'Grouping'}</SectionHeader>
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="iconText" onClick={() => editor?.ungroupSelected()} icon={Unlink} label={t('ungroup') || 'Ungroup'} theme={theme} />
                            </div>
                        </div>
                    )}

                    {/* PARAMETRIC SETTINGS */}
                    {selectedObject.type === 'polygon' && (
                        <div>
                            <SectionHeader>{t('shapeProperties')}</SectionHeader>
                            <NumberInput label={t('sides')} value={sides} onChange={(v) => updateParam('sides', v)} min={3} max={12} theme={theme} />
                        </div>
                    )}

                    {selectedObject.type === 'text' && (
                        <div>
                            <SectionHeader>{t('textProperties')}</SectionHeader>
                            <div className="space-y-2">
                                <div>
                                    <label className="text-[10px] text-gray-400 block mb-1">{t('content')}</label>
                                    <textarea
                                        value={selectedObject.text}
                                        onChange={(e) => {
                                            selectedObject.text = e.target.value;
                                            editor?.render();
                                        }}
                                        className={`w-full p-1.5 text-sm rounded border ${theme.inputBorder} ${theme.inputBg} ${theme.text}`}
                                        rows={3}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[10px] text-gray-400 block mb-1">{t('fontFamily')}</label>
                                        <select
                                            value={selectedObject.fontFamily}
                                            onChange={(e) => {
                                                selectedObject.fontFamily = e.target.value;
                                                editor?.render();
                                            }}
                                            className={`w-full p-1.5 text-sm rounded border ${theme.inputBorder} ${theme.inputBg} ${theme.text}`}
                                        >
                                            <option value="Arial">Arial</option>
                                            <option value="Times New Roman">Times New Roman</option>
                                            <option value="Courier New">Courier New</option>
                                            <option value="Georgia">Georgia</option>
                                            <option value="Verdana">Verdana</option>
                                        </select>
                                    </div>
                                    <NumberInput label={t('fontSize')} value={selectedObject.fontSize} onChange={(v) => { selectedObject.fontSize = parseFloat(v); editor?.render(); }} theme={theme} />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            selectedObject.fontWeight = selectedObject.fontWeight === 'bold' ? 'normal' : 'bold';
                                            editor?.render();
                                        }}
                                        className={`flex-1 p-1.5 rounded border ${theme.border} ${selectedObject.fontWeight === 'bold' ? 'bg-gray-200 dark:bg-gray-700' : ''}`}
                                    >
                                        B
                                    </button>
                                    <button
                                        onClick={() => {
                                            selectedObject.fontStyle = selectedObject.fontStyle === 'italic' ? 'normal' : 'italic';
                                            editor?.render();
                                        }}
                                        className={`flex-1 p-1.5 rounded border ${theme.border} ${selectedObject.fontStyle === 'italic' ? 'bg-gray-200 dark:bg-gray-700' : ''} italic`}
                                    >
                                        I
                                    </button>
                                </div>
                                <div className="mt-4">
                                    <Button
                                        variant="primary"
                                        onClick={() => {
                                            if (editor) {
                                                const command = new ConvertToPathCommand(selectedObject);
                                                editor.history.execute(command);
                                            }
                                        }}
                                        icon={Combine}
                                        label={t('convertToPath')}
                                        theme={theme}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {selectedObject.type === 'star' && (
                        <div>
                            <SectionHeader>{t('shapeProperties')}</SectionHeader>
                            <div className="grid grid-cols-2 gap-2">
                                <NumberInput label={t('points')} value={points} onChange={(v) => updateParam('points', v)} min={3} max={20} theme={theme} />
                                <NumberInput label={t('innerRadius')} value={innerRadius} onChange={(v) => updateParam('innerRadius', v)} min={0.1} max={0.9} step={0.05} theme={theme} />
                            </div>
                        </div>
                    )}

                    {/* LASER MODES */}
                    <div>
                        <SectionHeader>{t('laserMode')}</SectionHeader>
                        <div className="grid grid-cols-1 gap-2">
                            <button onClick={() => applyLaserMode('CUT')} className={`p-3 rounded border ${theme.border} hover:bg-red-500/10 hover:border-red-500 flex items-center gap-3 text-left`}>
                                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                                <div><div className="font-bold text-sm">{t('cut')}</div><div className="text-xs opacity-70">{t('cutDesc')}</div></div>
                            </button>
                            <button onClick={() => applyLaserMode('SCORE')} className={`p-3 rounded border ${theme.border} hover:bg-blue-500/10 hover:border-blue-500 flex items-center gap-3 text-left`}>
                                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                                <div><div className="font-bold text-sm">{t('score')}</div><div className="text-xs opacity-70">{t('scoreDesc')}</div></div>
                            </button>
                            <button onClick={() => applyLaserMode('ENGRAVE')} className={`p-3 rounded border ${theme.border} hover:bg-gray-500/10 hover:border-gray-500 flex items-center gap-3 text-left`}>
                                <div className="w-4 h-4 bg-black rounded-full"></div>
                                <div><div className="font-bold text-sm">{t('engrave')}</div><div className="text-xs opacity-70">{t('engraveDesc')}</div></div>
                            </button>
                        </div>
                        <Button variant="primary" onClick={deleteSelected} icon={Trash2} label={t('delete')} theme={theme} className="mt-4" />
                    </div>
                </div>
            ) : (
                <div className="text-center text-gray-500 mt-10 text-sm">
                    {t('noSelection')}
                </div>
            )}
        </div>
    );
}
