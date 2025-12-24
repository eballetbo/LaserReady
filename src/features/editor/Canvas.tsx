import React, { useEffect, useRef } from 'react';
import { PathEditor } from '../shapes/manipulation/path-editor';

interface CanvasProps {
    material: { width: number; height: number };
    setEditorInstance?: (editor: any) => void; // PathEditor type is not fully exported as a TS type yet, using any for now or I can assume it matches
    tool: string;
}

export default function Canvas({
    material,
    setEditorInstance,
    tool
}: CanvasProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const editorRef = useRef<any | null>(null); // Type as any for now until PathEditor is fully typed

    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.tool = tool;
        }
    }, [tool]);

    useEffect(() => {
        if (!canvasRef.current) return;

        // Initialize Editor
        const editor = new PathEditor(canvasRef.current, {
            gridSpacing: 25
        });
        editor.tool = tool;

        editorRef.current = editor;
        if (setEditorInstance) setEditorInstance(editor);

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
