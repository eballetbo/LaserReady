
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
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const editorRef = useRef<CanvasController | null>(null); // Update ref type to CanvasController

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.tool = tool;
        }
    }, [tool]);

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
        onInit(editor); // Call onInit here

        return () => {
            if (editor && typeof editor.dispose === 'function') {
                editor.dispose();
            }
        };
    }, []);

    // Handle Resize (Simple re-render trigger if needed, but canvas size is fixed by props for now)
    useEffect(() => {
        if (canvasRef.current) {
            canvasRef.current.width = material.width;
            canvasRef.current.height = material.height;
            editorRef.current?.render();
        }
    }, [material]);

    const handleDragOver = (e: React.DragEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e: React.DragEvent<HTMLCanvasElement>) => {
        e.preventDefault();
        const svgString = e.dataTransfer.getData('image/svg+xml');
        if (svgString && editorRef.current) {
            // const rect = canvasRef.current!.getBoundingClientRect();
            // Calculate drop position in canvas coordinates
            // We need to account for zoom and pan, which getMousePos does
            // But getMousePos expects a MouseEvent. React.DragEvent is compatible enough with required props usually.
            const pos = editorRef.current.getMousePos(e.nativeEvent);
            editorRef.current.importSVGString(svgString, pos);
        }
    };

    return (
        <div className="shadow-2xl bg-white">
            <canvas
                ref={canvasRef}
                width={material.width}
                height={material.height}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
            />
        </div>
    );
}
