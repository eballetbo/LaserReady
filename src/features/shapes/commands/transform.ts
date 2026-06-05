import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { IShape } from '../types';

/**
 * Generic transform command that captures shape state before/after
 * a move or scale operation, enabling undo/redo from the properties panel.
 */
export class TransformCommand implements Command {
    private shapeIds: string[];
    private beforeStates: Map<string, { nodes?: any[]; x?: number; y?: number; rotation?: number; fontSize?: number; scaleX?: number; scaleY?: number; children?: any[] }>;
    private applyFn: (shapes: IShape[]) => void;
    private applied = false;

    constructor(shapes: IShape[], applyFn: (shapes: IShape[]) => void) {
        this.shapeIds = shapes.map(s => s.id);
        this.applyFn = applyFn;

        this.beforeStates = new Map();
        shapes.forEach(shape => {
            this.beforeStates.set(shape.id, this.captureState(shape));
        });
    }

    private captureState(shape: IShape) {
        const state: any = { x: shape.x, y: shape.y, rotation: (shape as any).rotation };
        if (shape.nodes) {
            state.nodes = shape.nodes.map(n => n.clone());
        }
        if (shape.children) {
            state.children = shape.children.map(c => c.clone ? c.clone() : JSON.parse(JSON.stringify(c)));
        }
        if ((shape as any).fontSize !== undefined) {
            state.fontSize = (shape as any).fontSize;
            state.scaleX = (shape as any).scaleX;
            state.scaleY = (shape as any).scaleY;
        }
        return state;
    }

    private restoreState(shape: IShape, state: any) {
        if (state.nodes && shape.nodes) {
            shape.nodes = state.nodes.map((n: any) => n.clone());
        }
        if (state.children && shape.children) {
            (shape as any).children = state.children.map((c: any) => c.clone ? c.clone() : JSON.parse(JSON.stringify(c)));
        }
        if (state.x !== undefined) shape.x = state.x;
        if (state.y !== undefined) shape.y = state.y;
        if (state.rotation !== undefined) (shape as any).rotation = state.rotation;
        if (state.fontSize !== undefined) {
            (shape as any).fontSize = state.fontSize;
            (shape as any).scaleX = state.scaleX;
            (shape as any).scaleY = state.scaleY;
        }
    }

    execute(): void {
        if (!this.applied) {
            const { shapes } = useStore.getState();
            const targets = shapes.filter(s => this.shapeIds.includes(s.id));
            this.applyFn(targets);
            this.applied = true;
        }
        const { shapes, setShapes } = useStore.getState();
        setShapes([...shapes]);
    }

    undo(): void {
        const { shapes, setShapes } = useStore.getState();
        shapes.forEach(shape => {
            const state = this.beforeStates.get(shape.id);
            if (state) this.restoreState(shape, state);
        });
        setShapes([...shapes]);
    }
}
