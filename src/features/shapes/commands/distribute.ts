import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { Geometry, Rect } from '../../../core/math/geometry';

export class DistributeCommand implements Command {
    private shapeIds: string[];
    private axis: 'horizontal' | 'vertical';
    private originalPositions: Map<string, { x: number, y: number }>;
    readonly label = 'Distribute';

    constructor(shapeIds: string[], axis: 'horizontal' | 'vertical') {
        this.shapeIds = shapeIds;
        this.axis = axis;
        this.originalPositions = new Map();
    }

    execute(): void {
        const { shapes, setShapes } = useStore.getState();
        const shapesToDistribute = shapes.filter(s => this.shapeIds.includes(s.id));

        if (shapesToDistribute.length < 3) return;

        // Clear previous undo state for this execution
        this.originalPositions.clear();

        // Calculate centers and sort
        const items = shapesToDistribute.map(shape => {
            let bounds: Rect | undefined;
            if (shape.getBounds) {
                bounds = shape.getBounds();
            } else if (shape.nodes) {
                bounds = Geometry.calculateBoundingBox(shape.nodes);
            }

            // Fallback if bounds calc fails, though it shouldn't for valid shapes
            if (!bounds) return { shape, center: 0, currentPos: 0 };

            if (this.axis === 'horizontal') {
                return {
                    shape,
                    center: bounds.cx || (bounds.minX + bounds.width! / 2),
                    currentPos: bounds.cx || (bounds.minX + bounds.width! / 2) // We distribute by CENTER
                };
            } else {
                return {
                    shape,
                    center: bounds.cy || (bounds.minY + bounds.height! / 2),
                    currentPos: bounds.cy || (bounds.minY + bounds.height! / 2)
                };
            }
        });

        // Sort by center position
        items.sort((a, b) => a.center - b.center);

        const first = items[0];
        const last = items[items.length - 1];
        const count = items.length;
        const totalSpan = last.center - first.center;
        const step = totalSpan / (count - 1);

        const moves: Map<string, { dx: number, dy: number }> = new Map();

        // Iterate middle items
        for (let i = 1; i < count - 1; i++) {
            const item = items[i];
            const targetCenter = first.center + i * step;
            const delta = targetCenter - item.currentPos;

            if (Math.abs(delta) > 0.001) { // Floating point epsilon
                let dx = 0;
                let dy = 0;

                if (this.axis === 'horizontal') {
                    dx = delta;
                } else {
                    dy = delta;
                }

                item.shape.move?.(dx, dy);
                moves.set(item.shape.id, { dx, dy });
            }
        }

        // Store undo info
        moves.forEach((delta, id) => {
            this.originalPositions.set(id, { x: delta.dx, y: delta.dy });
        });

        // Update store if any changes
        if (moves.size > 0) {
            setShapes([...shapes]);
        }
    }

    undo(): void {
        const { shapes, setShapes } = useStore.getState();
        const shapesToDistribute = shapes.filter(s => this.shapeIds.includes(s.id));

        shapesToDistribute.forEach(shape => {
            const delta = this.originalPositions.get(shape.id);
            if (delta) {
                shape.move?.(-delta.x, -delta.y);
            }
        });

        setShapes([...shapes]);
    }
}
