
import React, { useEffect, useRef } from 'react';
import { CanvasController } from './controller';
import { DEFAULT_GRID_SPACING } from '../../config/constants';

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
                const { clientWidth, clientHeight } = containerRef.current;
                canvasRef.current.width = clientWidth;
                canvasRef.current.height = clientHeight;
                editorRef.current.render();
            }
        });

        resizeObserver.observe(containerRef.current);

        return () => resizeObserver.disconnect();
    }, []);

    // Material Update: Just trigger render, don't resize canvas (canvas is viewport)
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
        <div ref={containerRef} className="shadow-2xl bg-white w-full h-full">
            <canvas
                ref={canvasRef}
                className="w-full h-full block"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            />
        </div>
    );
}
