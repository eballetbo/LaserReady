import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';

export interface TextStyleProps {
    text?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    fontStyle?: string;
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
        const t = shape as any;
        if (props.text !== undefined) t.text = props.text;
        if (props.fontFamily !== undefined) t.fontFamily = props.fontFamily;
        if (props.fontSize !== undefined) t.fontSize = props.fontSize;
        if (props.fontWeight !== undefined) t.fontWeight = props.fontWeight;
        if (props.fontStyle !== undefined) t.fontStyle = props.fontStyle;
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
        const { shapes, setShapes } = useStore.getState();
        const newShapes = shapes.map(s => {
            if (s.id === this.shapeId) {
                const clone = s.clone!();
                (clone as any).text = this.newText;
                return clone;
            }
            return s;
        });
        setShapes(newShapes);
    }

    undo(): void {
        const { shapes, setShapes } = useStore.getState();
        const newShapes = shapes.map(s => {
            if (s.id === this.shapeId) {
                const clone = s.clone!();
                (clone as any).text = this.oldText;
                return clone;
            }
            return s;
        });
        setShapes(newShapes);
    }
}
