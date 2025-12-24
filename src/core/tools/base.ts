// Defining a minimal interface for what BaseTool expects from Editor.
// In a full migration, this should be imported from the Editor component or a meaningful type.
export interface IEditorContext {
    shapes: any[];
    selectedShapes: any[];
    config: any;
    tool: string;
    activePath: any;
    previewPoint: any;
    renderer: any;
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    getMousePos: (e: MouseEvent) => { x: number; y: number };
    render: () => void;
    moveSelected: (dx: number, dy: number) => void;
    activeLayerId: string;
}

export class BaseTool {
    editor: IEditorContext;

    constructor(editor: IEditorContext) {
        this.editor = editor;
    }

    onMouseDown(event: MouseEvent): void { }
    onMouseMove(event: MouseEvent): void { }
    onMouseUp(event: MouseEvent): void { }
    onKeyDown(event: KeyboardEvent): void { }
}

