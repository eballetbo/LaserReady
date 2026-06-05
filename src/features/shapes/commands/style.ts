import { Command } from '../../../core/commands/command';
import { IShape } from '../../shapes/types';
import { useStore } from '../../../store/useStore';

export interface StyleProperties {
    strokeColor?: string;
    strokeWidth?: number;
    fillColor?: string;
}

export class UpdateStyleCommand implements Command {
    private shapeIds: string[];
    private newStyle: StyleProperties;
    private oldStyles: Map<string, StyleProperties>;

    constructor(shapes: IShape[], newStyle: StyleProperties) {
        this.shapeIds = shapes.map(s => s.id);
        this.newStyle = newStyle;
        this.oldStyles = new Map();

        shapes.forEach(s => {
            this.oldStyles.set(s.id, {
                strokeColor: s.strokeColor,
                strokeWidth: s.strokeWidth,
                fillColor: s.fillColor
            });
        });
    }

    execute(): void {
        const { shapes, setShapes } = useStore.getState();
        const newShapes = shapes.map(shape => {
            if (!this.shapeIds.includes(shape.id)) return shape;
            return this.cloneWithStyle(shape, this.newStyle, false);
        });
        setShapes(newShapes);
    }

    undo(): void {
        const { shapes, setShapes } = useStore.getState();
        const newShapes = shapes.map(shape => {
            if (!this.shapeIds.includes(shape.id)) return shape;
            const oldStyle = this.oldStyles.get(shape.id);
            if (!oldStyle) return shape;
            return this.cloneWithStyle(shape, oldStyle, true);
        });
        setShapes(newShapes);
    }

    private cloneWithStyle(shape: IShape, style: StyleProperties, restoreExact: boolean): IShape {
        const clone = shape.clone ? shape.clone() : { ...shape };
        clone.id = shape.id;

        if (restoreExact) {
            clone.strokeColor = style.strokeColor;
            clone.strokeWidth = style.strokeWidth;
            clone.fillColor = style.fillColor;
        } else {
            if (style.strokeColor !== undefined) clone.strokeColor = style.strokeColor;
            if (style.strokeWidth !== undefined) clone.strokeWidth = style.strokeWidth;
            if (style.fillColor !== undefined) clone.fillColor = style.fillColor;
        }
        return clone;
    }
}
