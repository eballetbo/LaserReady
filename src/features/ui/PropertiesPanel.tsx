import { useState, useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { useLanguage } from '../../contexts/language';
import {
    Trash2, Combine, Minus, SquaresIntersect, XCircle, Link, Unlink,
    AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal, AlignStartVertical, AlignCenterVertical, AlignEndVertical,
    AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter, Scaling,
} from 'lucide-react';
import { IconNodeCorner, IconNodeSmooth, IconNodeSymmetric, IconSegmentLine, IconSegmentCurve, IconNodeBreak, IconDeleteNode, IconNodeAdd, IconNodeJoin, IconJoinSegment, IconDeleteSegment } from './icons';
import { CanvasController } from '../editor/controller';
import { Button, NumberInput, SectionHeader } from './components';
import { OffsetPanel } from './OffsetPanel';
import { OffsetCommand } from '../shapes/commands/offset';
import { ConvertToPathCommand } from '../shapes/commands/convert-to-path';
import { ChangeNodeTypeCommand, DeleteNodeCommand } from '../shapes/commands/node';
import { ConvertSegmentToLineCommand, ConvertSegmentToCurveCommand } from '../shapes/commands/segment';
import { BreakPathCommand } from '../shapes/commands/break-path';
import { AlignCommand } from '../shapes/commands/align';
import { DistributeCommand } from '../shapes/commands/distribute';
import { PIXELS_PER_MM } from '../../config/constants';
import { Geometry } from '../../core/math/geometry';

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
    const [alignToPage, setAlignToPage] = useState(false);

    const tool = useStore(state => state.tool);
    const filletRadius = useStore(state => state.filletRadius || 5);

    const selectedObject = selection.length === 1 ? selection[0] : null;
    const hasSelection = selection.length > 0;

    useEffect(() => {
        if (hasSelection) {
            const updateDims = () => {
                let bounds;
                if (selection.length > 1) {
                    bounds = Geometry.getCombinedBounds(selection);
                } else {
                    const obj = selection[0];
                    bounds = obj.getBounds ? obj.getBounds() : null;
                }

                if (!bounds) {
                    bounds = { minX: 0, minY: 0, width: 0, height: 0 };
                }

                setDimensions({
                    x: (bounds.minX / PIXELS_PER_MM).toFixed(2),
                    y: (bounds.minY / PIXELS_PER_MM).toFixed(2),
                    w: (bounds.width / PIXELS_PER_MM).toFixed(2),
                    h: (bounds.height / PIXELS_PER_MM).toFixed(2)
                });
            };
            updateDims();

            if (selectedObject) {
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
        }
    }, [selectedObject, selection, hasSelection]);

    const updateDimension = (key: string, value: string) => {
        setDimensions(prev => ({ ...prev, [key]: value }));
    };

    const commitDimension = (key: string) => {
        if (!hasSelection || !editor) return;

        const value = dimensions[key as keyof typeof dimensions];
        const val = parseFloat(value as string);
        if (isNaN(val)) return;

        let bounds;
        if (selection.length > 1) {
            bounds = Geometry.getCombinedBounds(selection);
        } else {
            const obj = selection[0];
            bounds = obj.getBounds ? obj.getBounds() : null;
        }

        if (!bounds) bounds = { minX: 0, minY: 0, width: 0, height: 0 };

        editor.startAction();

        // Convert Input Millimeters -> Internal Pixels
        const valPx = val * PIXELS_PER_MM;

        if (key === 'x') {
            const dx = valPx - bounds.minX;
            selection.forEach(obj => obj.move(dx, 0));
        } else if (key === 'y') {
            const dy = valPx - bounds.minY;
            selection.forEach(obj => obj.move(0, dy));
        } else if (key === 'w') {
            if (bounds.width === 0) return;
            // scale factor is ratio of new pixels / old pixels
            const sx = valPx / bounds.width;
            selection.forEach(obj => obj.scale(sx, 1, { x: bounds!.minX, y: bounds!.minY }));
        } else if (key === 'h') {
            if (bounds.height === 0) return;
            const sy = valPx / bounds.height;
            selection.forEach(obj => obj.scale(1, sy, { x: bounds!.minX, y: bounds!.minY }));
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
            {tool === 'fillet' && (
                <div className="mb-4 border-b border-gray-200 dark:border-gray-700 pb-4">
                    <SectionHeader>{t('filletSettings') || 'Fillet Settings'}</SectionHeader>
                    <div className="flex gap-2 items-center">
                        <NumberInput
                            label={t('radius') || 'Radius'}
                            value={filletRadius}
                            onChange={(v) => useStore.getState().setFilletRadius(Number(v))}
                            theme={theme}
                            min={0}
                            step={1}
                        />
                        <span className="text-xs text-muted-foreground ml-2">mm</span>
                    </div>
                </div>
            )}

            {tool === 'offset' && (
                <OffsetPanel
                    theme={theme}
                    onApply={(_dist, opts) => {
                        if (editor && selection.length > 0) {
                            const ids = selection.map(s => s.id);
                            editor.history.execute(new OffsetCommand(ids, opts));
                            editor.render();
                            // Switch back to select tool after apply
                            useStore.setState({ tool: 'select' });
                        }
                    }}
                    onCancel={() => useStore.setState({ tool: 'select' })}
                />
            )}

            {hasSelection ? (
                <div className="space-y-6">
                    {/* DIMENSIONS */}
                    {tool !== 'node-edit' && (
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
                    )}

                    {/* PARAMETRIC SETTINGS (Single Only) */}


                    {selectedObject && selectedObject.type === 'polygon' && (
                        <div>
                            <SectionHeader>{t('shapeProperties')}</SectionHeader>
                            <NumberInput label={t('sides')} value={sides} onChange={(v) => updateParam('sides', v)} min={3} max={12} theme={theme} />
                        </div>
                    )}

                    {selectedObject && selectedObject.type === 'text' && (
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
                                >
                                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                                    <span className="text-xs font-bold">{t('cut')}</span>
                                </button>
                                <button
                                    onClick={() => applyLaserMode('SCORE')}
                                    className={`p-2 rounded border ${theme.border} hover:bg-blue-500/10 hover:border-blue-500 flex flex-col items-center justify-center gap-1 h-16`}
                                    title={`${t('score')} - Blue Stroke`}
                                >
                                    <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                                    <span className="text-xs font-bold">{t('score')}</span>
                                </button>
                                <button
                                    onClick={() => applyLaserMode('ENGRAVE')}
                                    className={`p-2 rounded border ${theme.border} hover:bg-gray-500/10 hover:border-gray-500 flex flex-col items-center justify-center gap-1 h-16`}
                                    title={`${t('engrave')} - Black Fill`}
                                >
                                    <div className="w-4 h-4 bg-black rounded-full"></div>
                                    <span className="text-xs font-bold">{t('engrave')}</span>
                                </button>
                            </div>
                        </div>
                    )}


                    {/* OPERATIONS (Combined) */}
                    {tool === 'node-edit' && (
                        <div>
                            <SectionHeader>{t('nodeOperations') || 'Node Operations'}</SectionHeader>
                            <div className="grid grid-cols-4 gap-2">
                                {/* 1. INSERT / DELETE NODES (Topology) */}
                                <Button
                                    variant="icon"
                                    onClick={() => {
                                        // TODO: Implement InsertNodeCommand logic via button
                                        console.log('Insert Node implementation pending');
                                    }}
                                    icon={IconNodeAdd}
                                    label={t('Add') || 'Add'}
                                    theme={theme}
                                    className="text-gray-500"
                                    title="Insert new node (Double-click segment)"
                                />
                                <Button
                                    variant="icon"
                                    onClick={() => {
                                        const indices = useStore.getState().selectedNodeIndices;
                                        if (editor && selectedObject && indices.length > 0) {
                                            const command = new DeleteNodeCommand(selectedObject.id, indices);
                                            editor.history.execute(command);
                                            useStore.getState().setSelectedNodeIndices([]);
                                            editor.render();
                                        }
                                    }}
                                    icon={IconDeleteNode}
                                    label={t('Delete') || 'Delete'}
                                    theme={{ ...theme, buttonHover: 'hover:bg-red-500/10 hover:border-red-500 hover:text-red-500', iconColor: 'text-red-500' }}
                                    className="text-red-500 border-red-200 dark:border-red-900/30"
                                    disabled={useStore.getState().selectedNodeIndices.length === 0}
                                    title="Delete selected nodes (Del/Backspace)"
                                />

                                {/* 2. JOIN / BREAK (Connectivity) */}
                                <Button
                                    variant="icon"
                                    onClick={() => console.log('Join Nodes pending')}
                                    icon={IconNodeJoin}
                                    label={t('Join') || 'Join'}
                                    theme={theme}
                                    title="Join selected nodes (Merge)"
                                />
                                <Button
                                    variant="icon"
                                    onClick={() => {
                                        const indices = useStore.getState().selectedNodeIndices;
                                        if (editor && selectedObject && indices.length > 0) {
                                            indices.forEach(idx => {
                                                const command = new BreakPathCommand(selectedObject.id, idx);
                                                editor.history.execute(command);
                                            });
                                            editor.render();
                                        }
                                    }}
                                    icon={IconNodeBreak}
                                    label={t('Break') || 'Break'}
                                    theme={theme}
                                    disabled={useStore.getState().selectedNodeIndices.length === 0}
                                    title="Break path at selected nodes"
                                />

                                {/* 3. SEGMENT MODIFICATION (Join/Delete Segment) */}
                                <Button
                                    variant="icon"
                                    onClick={() => console.log('Join Segment pending')}
                                    icon={IconJoinSegment}
                                    label={t('Join Seg') || 'Join Seg'}
                                    theme={theme}
                                    title="Join selected endnodes with new segment"
                                />
                                <Button
                                    variant="icon"
                                    onClick={() => console.log('Delete Segment pending')}
                                    icon={IconDeleteSegment}
                                    label={t('Del Seg') || 'Del Seg'}
                                    theme={theme}
                                    title="Delete segment between two non-endpoint nodes"
                                />

                                {/* Spacer to fill row */}
                                <div className="hidden"></div>
                                <div className="hidden"></div>

                                {/* 4. NODE TYPE (Geometry) */}
                                <Button
                                    variant="icon"
                                    onClick={() => {
                                        const indices = useStore.getState().selectedNodeIndices;
                                        if (editor && selectedObject && indices.length > 0) {
                                            indices.forEach(idx => {
                                                const command = new ChangeNodeTypeCommand(selectedObject.id, idx, 'corner');
                                                editor.history.execute(command);
                                            });
                                            editor.render();
                                        }
                                    }}
                                    icon={IconNodeCorner}
                                    label={t('Corner') || 'Corner'}
                                    theme={theme}
                                    disabled={useStore.getState().selectedNodeIndices.length === 0}
                                    title="Make selected nodes corner (C)"
                                />
                                <Button
                                    variant="icon"
                                    onClick={() => {
                                        const indices = useStore.getState().selectedNodeIndices;
                                        if (editor && selectedObject && indices.length > 0) {
                                            indices.forEach(idx => {
                                                const command = new ChangeNodeTypeCommand(selectedObject.id, idx, 'smooth');
                                                editor.history.execute(command);
                                            });
                                            editor.render();
                                        }
                                    }}
                                    icon={IconNodeSmooth}
                                    label={t('Smooth') || 'Smooth'}
                                    theme={theme}
                                    disabled={useStore.getState().selectedNodeIndices.length === 0}
                                    title="Make selected nodes smooth (S)"
                                />
                                <Button
                                    variant="icon"
                                    onClick={() => {
                                        const indices = useStore.getState().selectedNodeIndices;
                                        if (editor && selectedObject && indices.length > 0) {
                                            indices.forEach(idx => {
                                                const command = new ChangeNodeTypeCommand(selectedObject.id, idx, 'symmetric');
                                                editor.history.execute(command);
                                            });
                                            editor.render();
                                        }
                                    }}
                                    icon={IconNodeSymmetric}
                                    label={t('Symmetric') || 'Symmetric'}
                                    theme={theme}
                                    disabled={useStore.getState().selectedNodeIndices.length === 0}
                                    title="Make selected nodes symmetric (Y)"
                                />

                                {/* Spacer */}
                                <div></div>

                                {/* 5. SEGMENT TYPE (Line/Curve) */}
                                <Button
                                    variant="icon"
                                    onClick={() => {
                                        const indices = useStore.getState().selectedNodeIndices;
                                        if (editor && selectedObject && indices.length > 0) {
                                            indices.forEach(idx => {
                                                const command = new ConvertSegmentToLineCommand(selectedObject.id, idx);
                                                editor.history.execute(command);
                                            });
                                            editor.render();
                                        }
                                    }}
                                    icon={IconSegmentLine}
                                    label={t('toLine') || 'Line'}
                                    theme={theme}
                                    disabled={useStore.getState().selectedNodeIndices.length === 0}
                                    title="Make selected segments lines (L)"
                                />
                                <Button
                                    variant="icon"
                                    onClick={() => {
                                        const indices = useStore.getState().selectedNodeIndices;
                                        if (editor && selectedObject && indices.length > 0) {
                                            indices.forEach(idx => {
                                                const command = new ConvertSegmentToCurveCommand(selectedObject.id, idx);
                                                editor.history.execute(command);
                                            });
                                            editor.render();
                                        }
                                    }}
                                    icon={IconSegmentCurve}
                                    label={t('toCurve') || 'Curve'}
                                    theme={theme}
                                    disabled={useStore.getState().selectedNodeIndices.length === 0}
                                    title="Make selected segments curves (B)"
                                />
                            </div>
                        </div>
                    )}

                    {tool !== 'node-edit' && (
                        <div>
                            <SectionHeader>{t('align') || 'Align and Distribute'}</SectionHeader>
                            <div className="space-y-2">
                                <div className="grid grid-cols-4 gap-2">
                                    <Button
                                        variant="icon"
                                        icon={AlignStartVertical}
                                        onClick={() => {
                                            if (editor && selection.length > 0) {
                                                const ids = selection.map(s => s.id);
                                                editor.history.execute(new AlignCommand(ids, 'left', alignToPage ? 'page' : 'selection'));
                                                editor.render();
                                            }
                                        }}
                                        theme={theme}
                                        title="Align Left"
                                        label=""
                                    />
                                    <Button
                                        variant="icon"
                                        icon={AlignCenterVertical}
                                        onClick={() => {
                                            if (editor && selection.length > 0) {
                                                const ids = selection.map(s => s.id);
                                                editor.history.execute(new AlignCommand(ids, 'center-v', alignToPage ? 'page' : 'selection'));
                                                editor.render();
                                            }
                                        }}
                                        theme={theme}
                                        title="Align Center Vertically"
                                        label=""
                                    />
                                    <Button
                                        variant="icon"
                                        icon={AlignEndVertical}
                                        onClick={() => {
                                            if (editor && selection.length > 0) {
                                                const ids = selection.map(s => s.id);
                                                editor.history.execute(new AlignCommand(ids, 'right', alignToPage ? 'page' : 'selection'));
                                                editor.render();
                                            }
                                        }}
                                        theme={theme}
                                        title="Align Right"
                                        label=""
                                    />
                                    <Button
                                        variant="icon"
                                        icon={AlignHorizontalDistributeCenter}
                                        onClick={() => {
                                            if (editor && selection.length > 2) {
                                                const ids = selection.map(s => s.id);
                                                /* To distribute horizontal we need to use vertical axis */
                                                editor.history.execute(new DistributeCommand(ids, 'vertical'));
                                                editor.render();
                                            }
                                        }}
                                        theme={theme}
                                        disabled={selection.length < 3}
                                        title="Distribute Horizontally"
                                        label=""
                                    />

                                    <Button
                                        variant="icon"
                                        icon={AlignStartHorizontal}
                                        onClick={() => {
                                            if (editor && selection.length > 0) {
                                                const ids = selection.map(s => s.id);
                                                editor.history.execute(new AlignCommand(ids, 'top', alignToPage ? 'page' : 'selection'));
                                                editor.render();
                                            }
                                        }}
                                        theme={theme}
                                        title="Align Top"
                                        label=""
                                    />
                                    <Button
                                        variant="icon"
                                        icon={AlignCenterHorizontal}
                                        onClick={() => {
                                            if (editor && selection.length > 0) {
                                                const ids = selection.map(s => s.id);
                                                editor.history.execute(new AlignCommand(ids, 'center-h', alignToPage ? 'page' : 'selection'));
                                                editor.render();
                                            }
                                        }}
                                        theme={theme}
                                        title="Align Center Horizontal"
                                        label=""
                                    />
                                    <Button
                                        variant="icon"
                                        icon={AlignEndHorizontal}
                                        onClick={() => {
                                            if (editor && selection.length > 0) {
                                                const ids = selection.map(s => s.id);
                                                editor.history.execute(new AlignCommand(ids, 'bottom', alignToPage ? 'page' : 'selection'));
                                                editor.render();
                                            }
                                        }}
                                        theme={theme}
                                        title="Align Bottom"
                                        label=""
                                    />
                                    <Button
                                        variant="icon"
                                        icon={AlignVerticalDistributeCenter}
                                        onClick={() => {
                                            if (editor && selection.length > 2) {
                                                const ids = selection.map(s => s.id);
                                                /* To distribute vertically we need to use vertical axis */
                                                editor.history.execute(new DistributeCommand(ids, 'vertical'));
                                                editor.render();
                                            }
                                        }}
                                        theme={theme}
                                        disabled={selection.length < 3}
                                        title="Distribute Vertically"
                                        label=""
                                    />
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <input
                                        type="checkbox"
                                        checked={alignToPage}
                                        onChange={(e) => setAlignToPage(e.target.checked)}
                                        className="rounded border-gray-300"
                                    />
                                    <span>{t('alignToPage') || 'Align to Page'}</span>
                                </div>
                            </div>
                        </div>
                    )}



                    {tool !== 'node-edit' && (
                        <div>
                            <SectionHeader>{t('operations') || 'Operations'}</SectionHeader>
                            <div className="space-y-4">

                                {/* Offset Button in Operations (optional shortcut) */}
                                <Button
                                    variant="iconText"
                                    onClick={() => useStore.setState({ tool: 'offset' })} // Activate tool
                                    icon={Scaling}
                                    label={t('offsetPath') || 'Offset Path'}
                                    theme={theme}
                                />

                                {/* Boolean Ops (Only if multiple) */}
                                {selection.length > 1 && (
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button variant="iconText" onClick={() => editor?.performBooleanOperation('unite')} icon={Combine} label={t('unite')} theme={theme} />
                                        <Button variant="iconText" onClick={() => editor?.performBooleanOperation('subtract')} icon={Minus} label={t('subtract')} theme={theme} />
                                        <Button variant="iconText" onClick={() => editor?.performBooleanOperation('intersect')} icon={SquaresIntersect} label={t('intersect')} theme={theme} />
                                        <Button variant="iconText" onClick={() => editor?.performBooleanOperation('exclude')} icon={XCircle} label={t('exclude')} theme={theme} />
                                    </div>
                                )}

                                {/* Grouping (Single or Multiple) */}
                                {(selection.length > 1 || (selectedObject && selectedObject.type === 'group')) && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {selection.length > 1 && (
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
                                        label={`${t('delete')} (${selection.length})`}
                                        theme={{ ...theme, buttonHover: 'hover:bg-red-500/10 hover:border-red-500 hover:text-red-500', iconColor: 'text-red-500' }}
                                        className="w-full justify-center text-red-500 border-red-200 dark:border-red-900/30"
                                    />
                                </div>
                            </div>
                        </div>
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
