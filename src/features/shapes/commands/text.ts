import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';

export interface TextStyleProps {
    text?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    fontStyle?: string;
    hSpace?: number;
    vSpace?: number;
    alignX?: 'left' | 'center' | 'right';
    alignY?: 'top' | 'middle' | 'bottom';
    upperCase?: boolean;
    bend?: number;
    distort?: boolean;
    weld?: boolean;
    pathId?: string | null;
}

export class ChangeTextStyleCommand implements Command {
    private shapeId: string;
    private oldProps: TextStyleProps;
    private newProps: TextStyleProps;

    constructor(shapeId: string, oldProps: TextStyleProps, newProps: TextStyleProps) {
        this.shapeId = shapeId;
        this.oldProps = oldProps;
        this.newProps = newProps;
    }

    execute(): void {
        this.applyProps(this.newProps);
    }

    undo(): void {
        this.applyProps(this.oldProps);
    }

    private applyProps(props: TextStyleProps): void {
        const { shapes, setShapes } = useStore.getState();
        const shape = shapes.find(s => s.id === this.shapeId);
        if (!shape) return;
        const t = shape as Record<string, unknown>;
        for (const [key, value] of Object.entries(props)) {
            if (value !== undefined) t[key] = value;
        }
        setShapes([...shapes]);
    }
}

export class ChangeTextCommand implements Command {
    private shapeId: string;
    private oldText: string;
    private newText: string;

    constructor(shapeId: string, oldText: string, newText: string) {
        this.shapeId = shapeId;
        this.oldText = oldText;
        this.newText = newText;
    }

    execute(): void {
        this.applyText(this.newText);
    }

    undo(): void {
        this.applyText(this.oldText);
    }

    private applyText(text: string): void {
        const { shapes, setShapes } = useStore.getState();
        const shape = shapes.find(s => s.id === this.shapeId);
        if ('text' in shape) {
            (shape as { text: string }).text = text;
        }
        setShapes([...shapes]);
    }
}
