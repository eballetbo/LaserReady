import React, { useEffect, useRef } from 'react';
import { CanvasController } from './controller';
import { DEFAULT_GRID_SPACING } from '../../config/constants';
import { Ruler } from '../ui/Ruler';

interface CanvasProps {
    material: { width: number; height: number };
    setEditorInstance?: (editor: CanvasController) => void;
    tool: string;
    onInit: (editor: CanvasController) => void;
    onSelectionChange?: (selection: any[]) => void;
}

export default function Canvas({
    material,
    setEditorInstance,
    tool,
    onInit,
    onSelectionChange
}: CanvasProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const editorRef = useRef<CanvasController | null>(null);
    const hasPerformedInitialFit = useRef(false);

    // Initial Setup
    useEffect(() => {
        if (!canvasRef.current) return;

        // Initialize Editor
        const editor = new CanvasController(canvasRef.current, {
            onSelectionChange,
            gridSpacing: DEFAULT_GRID_SPACING
        });
        editor.tool = tool;

        editorRef.current = editor;
        if (setEditorInstance) setEditorInstance(editor);
        onInit(editor);

        return () => {
            if (editor && typeof editor.dispose === 'function') {
                editor.dispose();
            }
        };
    }, []);

    // Tool Update
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.tool = tool;
        }
    }, [tool]);

    // Handle Resize (Viewport Sizing)
    useEffect(() => {
        if (!containerRef.current || !canvasRef.current || !editorRef.current) return;

        const resizeObserver = new ResizeObserver(() => {
            if (containerRef.current && canvasRef.current && editorRef.current) {
                // The containerRef is now the viewport area for the canvas
                const { clientWidth, clientHeight } = containerRef.current;

                // Only resize if dimensions actually changed (avoid loops)
                if (canvasRef.current.width !== clientWidth || canvasRef.current.height !== clientHeight) {
                    canvasRef.current.width = clientWidth;
                    canvasRef.current.height = clientHeight;
                    editorRef.current.render();

                    // Initial Fit to Screen once we have valid dimensions
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

    // Material Update
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

            {/* Top-Left Corner */}
            <div className="bg-gray-50 border-r border-b border-gray-300 z-10" />

            {/* Top Ruler */}
            <div className="relative border-b border-gray-300 z-10 bg-gray-50 overflow-hidden">
                <Ruler orientation="horizontal" />
            </div>

            {/* Left Ruler */}
            <div className="relative border-r border-gray-300 z-10 bg-gray-50 overflow-hidden">
                <Ruler orientation="vertical" />
            </div>

            {/* Main Canvas Viewport */}
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
