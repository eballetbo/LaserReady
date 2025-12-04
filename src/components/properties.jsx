import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/language';
import { Settings, Trash2, Combine, Minus, SquaresIntersect, XCircle } from 'lucide-react';
import { LASER_MODES } from '../utils/laser-modes';

export default function PropertiesPanel({ theme, selection, editor, applyLaserMode, deleteSelected }) {
    const { t } = useLanguage();
    const [dimensions, setDimensions] = useState({ x: 0, y: 0, w: 0, h: 0 });
    const [sides, setSides] = useState(6);
    const [points, setPoints] = useState(5);
    const [innerRadius, setInnerRadius] = useState(0.382);

    const selectedObject = selection.length === 1 ? selection[0] : null;

    useEffect(() => {
        if (selectedObject) {
            const updateDims = () => {
                const bounds = selectedObject.getBounds();
                setDimensions({
                    x: bounds.minX,
                    y: bounds.minY,
                    w: bounds.width,
                    h: bounds.height
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
            // We don't have event listeners on shapes yet, so this might not update in real-time during drag
            // But PathEditor re-renders on drag, we might need a way to force update here?
            // For now, it updates on selection change.
        }
    }, [selectedObject, selection]); // Update when selection changes

    const updateDimension = (key, value) => {
        if (!selectedObject) return;
        const val = parseFloat(value);
        if (isNaN(val)) return;

        // TODO: Implement dimension update for PathShape
        // selectedObject.set(key, val);
        // editor.render();
        setDimensions(prev => ({ ...prev, [key]: val }));
    };

    const updateParam = (key, value) => {
        if (key === 'sides') setSides(value);
        if (key === 'points') setPoints(value);
        if (key === 'innerRadius') setInnerRadius(value);

        if (!selectedObject || !selectedObject.params) return;

        let val = parseFloat(value);
        if (isNaN(val)) return;
        if (key === 'sides' && val < 3) return;
        if (key === 'points' && val < 3) return;
        if (key === 'innerRadius' && (val <= 0 || val >= 1)) return;

        selectedObject.params[key] = val;
        editor.updateShape(selectedObject);
    };

    return (
        <div className={`w-72 ${theme.panel} border-l ${theme.border} flex flex-col shrink-0 z-20 p-4`}>
            <h2 className="font-bold mb-4 flex items-center gap-2"><Settings size={18} /> {t('properties')}</h2>

            {selection.length > 1 ? (
                <div className="space-y-6">
                    <div>
                        <div className="text-xs text-gray-500 uppercase font-bold mb-2">{t('booleanOperations')}</div>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => editor.performBooleanOperation('unite')} className={`p-2 rounded border ${theme.border} ${theme.buttonHover} flex flex-col items-center gap-1`}>
                                <Combine size={20} /> <span className="text-xs">{t('unite')}</span>
                            </button>
                            <button onClick={() => editor.performBooleanOperation('subtract')} className={`p-2 rounded border ${theme.border} ${theme.buttonHover} flex flex-col items-center gap-1`}>
                                <Minus size={20} /> <span className="text-xs">{t('subtract')}</span>
                            </button>
                            <button onClick={() => editor.performBooleanOperation('intersect')} className={`p-2 rounded border ${theme.border} ${theme.buttonHover} flex flex-col items-center gap-1`}>
                                <SquaresIntersect size={20} /> <span className="text-xs">{t('intersect')}</span>
                            </button>
                            <button onClick={() => editor.performBooleanOperation('exclude')} className={`p-2 rounded border ${theme.border} ${theme.buttonHover} flex flex-col items-center gap-1`}>
                                <XCircle size={20} /> <span className="text-xs">{t('exclude')}</span>
                            </button>
                        </div>
                    </div>
                    <button onClick={deleteSelected} className="w-full py-2 mt-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded hover:bg-red-500/20">
                        <Trash2 size={16} className="inline mr-2" /> {t('delete')} ({selection.length})
                    </button>
                </div>
            ) : selectedObject ? (
                <div className="space-y-6">
                    {/* DIMENSIONS */}
                    <div>
                        <div className="text-xs text-gray-500 uppercase font-bold mb-2">{t('dimensions')}</div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-[10px] text-gray-400 block mb-1">X</label>
                                <input
                                    type="number"
                                    value={Math.round(dimensions.x)}
                                    onChange={(e) => updateDimension('x', e.target.value)}
                                    className={`w-full p-1.5 text-sm rounded border ${theme.inputBorder} ${theme.inputBg} ${theme.text}`}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-400 block mb-1">Y</label>
                                <input
                                    type="number"
                                    value={Math.round(dimensions.y)}
                                    onChange={(e) => updateDimension('y', e.target.value)}
                                    className={`w-full p-1.5 text-sm rounded border ${theme.inputBorder} ${theme.inputBg} ${theme.text}`}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-400 block mb-1">{t('width')}</label>
                                <input
                                    type="number"
                                    value={Math.round(dimensions.w)}
                                    onChange={(e) => updateDimension('w', e.target.value)}
                                    className={`w-full p-1.5 text-sm rounded border ${theme.inputBorder} ${theme.inputBg} ${theme.text}`}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-gray-400 block mb-1">{t('height')}</label>
                                <input
                                    type="number"
                                    value={Math.round(dimensions.h)}
                                    onChange={(e) => updateDimension('h', e.target.value)}
                                    className={`w-full p-1.5 text-sm rounded border ${theme.inputBorder} ${theme.inputBg} ${theme.text}`}
                                />
                            </div>
                        </div>
                    </div>

                    {/* PARAMETRIC SETTINGS */}
                    {selectedObject.type === 'polygon' && (
                        <div>
                            <div className="text-xs text-gray-500 uppercase font-bold mb-2">{t('shapeProperties')}</div>
                            <div>
                                <label className="text-[10px] text-gray-400 block mb-1">{t('sides')}</label>
                                <input
                                    type="number"
                                    min="3"
                                    max="12"
                                    value={sides}
                                    onChange={(e) => updateParam('sides', e.target.value)}
                                    className={`w-full p-1.5 text-sm rounded border ${theme.inputBorder} ${theme.inputBg} ${theme.text}`}
                                />
                            </div>
                        </div>
                    )}

                    {selectedObject.type === 'star' && (
                        <div>
                            <div className="text-xs text-gray-500 uppercase font-bold mb-2">{t('shapeProperties')}</div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] text-gray-400 block mb-1">{t('points')}</label>
                                    <input
                                        type="number"
                                        min="3"
                                        max="20"
                                        value={points}
                                        onChange={(e) => updateParam('points', e.target.value)}
                                        className={`w-full p-1.5 text-sm rounded border ${theme.inputBorder} ${theme.inputBg} ${theme.text}`}
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] text-gray-400 block mb-1">{t('innerRadius')}</label>
                                    <input
                                        type="number"
                                        min="0.1"
                                        max="0.9"
                                        step="0.05"
                                        value={innerRadius}
                                        onChange={(e) => updateParam('innerRadius', e.target.value)}
                                        className={`w-full p-1.5 text-sm rounded border ${theme.inputBorder} ${theme.inputBg} ${theme.text}`}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* LASER MODES */}
                    <div>
                        <div className="text-xs text-gray-500 uppercase font-bold mb-2">{t('laserMode')}</div>
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
                        <button onClick={deleteSelected} className="w-full py-2 mt-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded hover:bg-red-500/20">
                            <Trash2 size={16} className="inline mr-2" /> {t('delete')}
                        </button>
                    </div>
                </div>
            ) : (
                <div className="text-center text-gray-500 mt-10 text-sm">
                    {t('noSelection')}
                </div>
            )
            }
        </div >
    );
}
