import React, { useEffect, useRef, useCallback } from 'react';
import { CanvasController } from './controller';
import { DEFAULT_GRID_SPACING } from '../../config/constants';
import { Ruler } from '../ui/Ruler';
import { IShape } from '../shapes/types';
import { ToolType } from '../../config/shortcuts';

interface CanvasProps {
    material: { width: number; height: number };
    tool: ToolType;
    onInit: (editor: CanvasController) => void;
    onSelectionChange?: (selection: IShape[]) => void;
}

const CANVAS_CLASS = 'absolute inset-0 block touch-none select-none outline-none w-full h-full';

export default function Canvas({
    material,
    tool,
    onInit,
    onSelectionChange
}: CanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const contentCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const editorRef = useRef<CanvasController | null>(null);
    const hasPerformedInitialFit = useRef(false);
    const selectionCallbackRef = useRef(onSelectionChange);

    useEffect(() => {
        selectionCallbackRef.current = onSelectionChange;
    });

    const stableSelectionCallback = useCallback((sel: IShape[]) => {
        selectionCallbackRef.current?.([...sel]);
    }, []);

    useEffect(() => {
        if (!bgCanvasRef.current || !contentCanvasRef.current || !overlayCanvasRef.current) return;

        const editor = new CanvasController(
            {
                background: bgCanvasRef.current,
                content: contentCanvasRef.current,
                overlay: overlayCanvasRef.current
            },
            {
                onSelectionChange: stableSelectionCallback,
                gridSpacing: DEFAULT_GRID_SPACING
            }
        );
        editor.tool = tool;

        editorRef.current = editor;
        if (typeof window !== 'undefined' && import.meta.env.DEV) {
            (window as any).editorInstance = editor;
        }
        onInit(editor);

        return () => {
            if (editor && typeof editor.dispose === 'function') {
                editor.dispose();
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.tool = tool;
        }
    }, [tool]);

    useEffect(() => {
        if (!containerRef.current || !bgCanvasRef.current || !contentCanvasRef.current || !overlayCanvasRef.current || !editorRef.current) return;

        const canvases = [bgCanvasRef.current, contentCanvasRef.current, overlayCanvasRef.current];

        const resizeObserver = new ResizeObserver(() => {
            if (!containerRef.current || !editorRef.current) return;
            const { clientWidth, clientHeight } = containerRef.current;

            const needsResize = canvases.some(c => c.width !== clientWidth || c.height !== clientHeight);
            if (needsResize) {
                canvases.forEach(c => {
                    c.width = clientWidth;
                    c.height = clientHeight;
                });
                editorRef.current.render();

                if (!hasPerformedInitialFit.current && clientWidth > 0 && clientHeight > 0) {
                    editorRef.current.fitToScreen();
                    hasPerformedInitialFit.current = true;
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
                <canvas ref={bgCanvasRef} className={CANVAS_CLASS} style={{ zIndex: 0 }} />
                <canvas ref={contentCanvasRef} className={CANVAS_CLASS} style={{ zIndex: 1 }} />
                <canvas
                    ref={overlayCanvasRef}
                    data-testid="main-canvas"
                    aria-label="Design canvas"
                    role="application"
                    className={CANVAS_CLASS}
                    style={{ zIndex: 2 }}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                />
            </div>
        </div>
    );
}
