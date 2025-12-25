import { Command } from '../../../core/commands/command';
import { IShape } from '../../shapes/types';
import { useStore } from '../../../store/useStore';
import { PathShape } from '../models/path';

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

        // Capture old styles
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

        // We must map over shapes to create new instances (immutability)
        // or mutate if ensuring re-render via setShapes([...])
        // To be safe and respect immutability pattern:
        const newShapes = shapes.map((shape) => {
            const s = shape as any; // Cast to any to handle both instances and plain objects
            if (this.shapeIds.includes(s.id)) {
                // Must cast to PathShape or ensure clone?
                // Better to assume shapes are objects we can clone or mutate then copy.
                // If they are PathShape instances, they have clone().
                // But typically in store they might be just objects if rehydrated?
                // Assuming PathShape instances for now based on other code.

                const style = this.newStyle;
                // If s is PathShape instance
                if (s instanceof PathShape) {
                    const clone = s.clone();
                    clone.id = s.id; // CRITICAL: Preserve ID for history tracking
                    if (style.strokeColor !== undefined) clone.strokeColor = style.strokeColor;
                    if (style.strokeWidth !== undefined) clone.strokeWidth = style.strokeWidth;
                    if (style.fillColor !== undefined) clone.fillColor = style.fillColor;
                    return clone;
                } else {
                    // Fallback for plain objects
                    return {
                        ...s,
                        strokeColor: style.strokeColor !== undefined ? style.strokeColor : s.strokeColor,
                        strokeWidth: style.strokeWidth !== undefined ? style.strokeWidth : s.strokeWidth,
                        fillColor: style.fillColor !== undefined ? style.fillColor : s.fillColor
                    };
                }
            }
            return s;
        });

        setShapes(newShapes);
    }

    undo(): void {
        const { shapes, setShapes } = useStore.getState();

        const newShapes = shapes.map((shape) => {
            const s = shape as any;
            if (this.shapeIds.includes(s.id)) {
                const oldStyle = this.oldStyles.get(s.id);
                if (!oldStyle) return s;

                if (s instanceof PathShape) {
                    const clone = s.clone();
                    clone.id = s.id; // CRITICAL: Preserve ID

                    if (oldStyle.strokeColor === undefined) delete clone.strokeColor;
                    else clone.strokeColor = oldStyle.strokeColor;

                    if (oldStyle.strokeWidth === undefined) delete clone.strokeWidth;
                    else clone.strokeWidth = oldStyle.strokeWidth;

                    if (oldStyle.fillColor === undefined) delete clone.fillColor;
                    else clone.fillColor = oldStyle.fillColor;

                    return clone;
                } else {
                    return {
                        ...s,
                        ...oldStyle
                    };
                }
            }
            return s;
        });

        setShapes(newShapes);
    }
}
