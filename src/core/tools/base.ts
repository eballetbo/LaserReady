import { IShape } from '../../features/shapes/types';
import { RendererConfig } from '../../features/editor/render/types';
import { Point, Rect } from '../math/geometry';

export interface SelectionBox {
    x: number;
    y: number;
    width: number;
    height: number;
    style: { fill: string; stroke: string };
}

export interface IHistoryManager {
    execute(command: { execute(): void; undo(): void }): void;
    undo(): void;
    redo(): void;
    canUndo(): boolean;
    canRedo(): boolean;
    clear(): void;
}

export interface ISnapManager {
    snapPoint(candidate: Point, excludeIds?: string[]): { point: Point; type: string; sourceShapeId?: string };
    snapAngle(angle: number, constrain: boolean): number;
    activeSnap: { point: Point; type: string } | null;
    settings: { enabled: boolean; grid: boolean; objects: boolean; threshold: number };
    clear(): void;
}

export interface IEditorContext {
    shapes: IShape[];
    selectedShapes: IShape[];
    config: RendererConfig;
    tool: string;
    activePath: IShape | null;
    previewPoint: Point | null;
    renderer: { drawScene(...args: unknown[]): void };
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    getMousePos: (e: MouseEvent) => Point;
    render: () => void;
    renderImmediate: () => void;
    moveSelected: (dx: number, dy: number) => void;
    activeLayerId: string;
    selectionBox: SelectionBox | null;
    previewOrigin: Point | null;
    history: IHistoryManager;
    selectedShape?: IShape;
    zoom: number;
    pan: Point;
    snapManager: ISnapManager;
}

export class BaseTool {
    editor: IEditorContext;

    constructor(editor: IEditorContext) {
        this.editor = editor;
    }

    onMouseDown(_event: MouseEvent): void { }
    onMouseMove(_event: MouseEvent): void { }
    onMouseUp(_event: MouseEvent): void { }
    onContextMenu(_event: MouseEvent): void { }
    onKeyDown(_event: KeyboardEvent): void { }
    onActivate(): void { }
    onDeactivate(): void { }
}
