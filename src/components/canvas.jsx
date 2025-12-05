import React, { useEffect, useRef } from 'react';
import { PathEditor } from '../core/path-editor';

export default function Canvas({
    material,
    setEditorInstance,
    tool
}) {
    const canvasRef = useRef(null);
    const editorRef = useRef(null);

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
            editor.dispose();
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
    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = (e) => {
        e.preventDefault();
        const svgString = e.dataTransfer.getData('image/svg+xml');
        if (svgString && editorRef.current) {
            const rect = canvasRef.current.getBoundingClientRect();
            // Calculate drop position in canvas coordinates
            // We need to account for zoom and pan, which getMousePos does
            // But getMousePos expects a MouseEvent, we can construct a mock one or use the logic directly
            // Let's use the editor's getMousePos logic if possible, or replicate it
            // Editor.getMousePos takes {clientX, clientY}
            const pos = editorRef.current.getMousePos(e);
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
