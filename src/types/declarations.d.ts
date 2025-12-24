declare module '*/path-editor.js' {
    export class PathEditor {
        constructor(canvas: HTMLCanvasElement, options?: any);
        tool: string;
        shapes: any[];
        render(): void;
        clear(): void;
        undo(): void;
        redo(): void;
        deleteSelected(): void;
        zoomIn(): void;
        zoomOut(): void;
        resetZoom(): void;
        applyStyle(style: any): void;
        performBooleanOperation(op: string): void;
        updateShape(shape: any): void;
        startAction(): void;
        endAction(): void;
        importSVGString(svg: string, pos?: { x: number, y: number }): void;
        onSelectionChange?: (selection: any[]) => void;
        getMousePos(e: any): { x: number, y: number };
    }
}

declare module '*/laser-modes.js' {
    export const LASER_MODES: Record<string, any>;
}

declare module '*/translations' {
    export const translations: Record<string, any>;
}
