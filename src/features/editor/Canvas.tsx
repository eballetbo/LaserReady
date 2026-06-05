import React, { useEffect, useRef, useCallback } from 'react';
import { CanvasController } from './controller';
import { DEFAULT_GRID_SPACING } from '../../config/constants';
import { Ruler } from '../ui/Ruler';
import { IShape } from '../shapes/types';

interface CanvasProps {
    material: { width: number; height: number };
    tool: string;
    onInit: (editor: CanvasController) => void;
    onSelectionChange?: (selection: IShape[]) => void;
}

export default function Canvas({
    material,
    tool,
    onInit,
    onSelectionChange
}: CanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const editorRef = useRef<CanvasController | null>(null);
    const hasPerformedInitialFit = useRef(false);
    const selectionCallbackRef = useRef(onSelectionChange);

    selectionCallbackRef.current = onSelectionChange;

    const stableSelectionCallback = useCallback((sel: IShape[]) => {
        selectionCallbackRef.current?.([...sel]);
    }, []);

    useEffect(() => {
        if (!canvasRef.current) return;

        const editor = new CanvasController(canvasRef.current, {
            onSelectionChange: stableSelectionCallback,
            gridSpacing: DEFAULT_GRID_SPACING
        });
        editor.tool = tool;

        editorRef.current = editor;
        onInit(editor);

        return () => {
            if (editor && typeof editor.dispose === 'function') {
                editor.dispose();
            }
        };
    }, []);

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.tool = tool;
        }
    }, [tool]);

    useEffect(() => {
        if (!containerRef.current || !canvasRef.current || !editorRef.current) return;

        const resizeObserver = new ResizeObserver(() => {
            if (containerRef.current && canvasRef.current && editorRef.current) {
                const { clientWidth, clientHeight } = containerRef.current;

                if (canvasRef.current.width !== clientWidth || canvasRef.current.height !== clientHeight) {
                    canvasRef.current.width = clientWidth;
                    canvasRef.current.height = clientHeight;
                    editorRef.current.render();

                    if (!hasPerformedInitialFit.current && clientWidth > 0 && clientHeight > 0) {
                        editorRef.current.fitToScreen();
                        hasPerformedInitialFit.current = true;
                    }
                }
            }
        });

        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, []);

    useEffect(() => {
        editorRef.current?.render();
    }, [material]);

    const handleDragOver = (e: React.DragEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e: React.DragEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const svgString = e.dataTransfer.getData('image/svg+xml');
        if (svgString && editorRef.current) {
            const pos = editorRef.current.getMousePos(e.nativeEvent);
            editorRef.current.importSVGString(svgString, pos);
        }
    };

    return (
        <div className="w-full h-full grid bg-gray-100 overflow-hidden"
            style={{
                gridTemplateColumns: '20px 1fr',
                gridTemplateRows: '20px 1fr'
            }}>

            <div className="bg-gray-50 border-r border-b border-gray-300 z-10" />

            <div className="relative border-b border-gray-300 z-10 bg-gray-50 overflow-hidden">
                <Ruler orientation="horizontal" />
            </div>

            <div className="relative border-r border-gray-300 z-10 bg-gray-50 overflow-hidden">
                <Ruler orientation="vertical" />
            </div>

            <div ref={containerRef} className="relative bg-white overflow-hidden shadow-inner">
                <canvas
                    ref={canvasRef}
                    data-testid="main-canvas"
                    aria-label="Design canvas"
                    role="application"
                    className="block touch-none select-none outline-none w-full h-full"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                />
            </div>
        </div>
    );
}
