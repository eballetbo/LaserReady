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

    return (
        <div className="shadow-2xl bg-white">
            <canvas
                ref={canvasRef}
                width={material.width}
                height={material.height}
            />
        </div>
    );
}
