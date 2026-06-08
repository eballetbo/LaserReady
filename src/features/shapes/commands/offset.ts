import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { offsetShape, JoinStyle } from '../../../core/math/offset';
import { PathShape } from '../models/path';
import { IShape } from '../types';

export interface OffsetOptions {
    distance: number;
    copies: boolean; // If true, keep original and create new. If false, replace original.
    join?: JoinStyle;
}

export class OffsetCommand implements Command {
    private shapeIds: string[];
    private options: OffsetOptions;

    // State for Undo/Redo
    private addedShapes: IShape[] = [];
    private removedShapes: IShape[] = [];
    readonly label = 'Offset';

    constructor(shapeIds: string[], options: OffsetOptions) {
        this.shapeIds = shapeIds;
        this.options = options;
    }

    execute(): void {
        const { shapes, addShapes, removeShapes, setSelectedShapes } = useStore.getState();
        const targets = shapes.filter(s => this.shapeIds.includes(s.id));



        if (targets.length === 0) return;

        // If we already ran this (redo), we just re-apply the changes
        if (this.addedShapes.length > 0 || this.removedShapes.length > 0) {
            if (this.removedShapes.length > 0) {
                removeShapes(this.removedShapes.map(s => s.id));
            }
            if (this.addedShapes.length > 0) {
                addShapes(this.addedShapes);
                setSelectedShapes(this.addedShapes.map(s => s.id));
            }
            return;
        }

        // Logic:
        // 1. Calculate offsets
        // 2. Prepare added/removed lists
        // 3. Apply

        const newShapes: PathShape[] = [];
        const toRemove: IShape[] = [];

        // For now, treat each shape individually unless we want to union them?
        // Let's stick to individual offset for the command. 
        // If the user wants to union, they should use a boolean op first. 
        // Or we could trigger `offsetShapes` if multiple selected?
        // Usually Offset Tool applies to each object relative to itself.

        targets.forEach(target => {
            if (target.type !== 'path' && !target.nodes) {
                // Skip non-path shapes for now (unless we convert them)
                // But PathShape covers most.
                return;
            }

            // Cast to PathShape for logic (assuming shape structure is compatible)
            // TODO: Convert Rect/Poly to PathShape if needed?
            // offsetShape handles PathShape. 
            // If target is effectively a path (has nodes), we can treat it as such.
            // But we need to ensure we don't break types.
            if (!(target instanceof PathShape)) {
                // If it's a "live" rect, we might need a converter.
                // For now, assume mainly PathShapes or we rely on duck typing?
                // offsetShape expects PathShape class instance methods (clone).
                // If store has POJOs (from JSON), we must hydrate them.
                // But generally store objects *should* be instances?
                // Actually, store usually holds instances.
            }

            // Hydrate if needed?
            // Let's assume store has instances for now, or use our helper logic.
            // offsetShape expects inputs that match PathShape interface.

            // We need to cast strictly or hydrate.
            // Safe bet: Hydrate to be sure.
            const inputShape = target instanceof PathShape ? target : PathShape.fromJSON(target);

            const offsetResults = offsetShape(inputShape, this.options.distance, { join: this.options.join });

            offsetResults.forEach(res => {
                // Copy properties?
                res.strokeColor = inputShape.strokeColor;
                res.strokeWidth = inputShape.strokeWidth;
                res.fillColor = inputShape.fillColor; // Maybe remove fill for offset line?
                res.layerId = inputShape.layerId;

                // If explicit distance is negative (inward), maybe keep fill?
                // If outward, usually we want an outline.
                // Inkscape: Offset of a filled shape is filled.

                newShapes.push(res);
            });

            if (!this.options.copies) {
                toRemove.push(target);
            }
        });

        // Store for undo
        this.addedShapes = newShapes;
        this.removedShapes = toRemove;

        // Apply
        if (toRemove.length > 0) {
            removeShapes(toRemove.map(s => s.id));
        }
        if (newShapes.length > 0) {
            addShapes(newShapes);
            setSelectedShapes(newShapes.map(s => s.id));
        }
    }

    undo(): void {
        const { addShapes, removeShapes, setSelectedShapes } = useStore.getState();

        // Reverse operations
        if (this.addedShapes.length > 0) {
            removeShapes(this.addedShapes.map(s => s.id));
        }

        if (this.removedShapes.length > 0) {
            addShapes(this.removedShapes);
            // Restore selection to original Targets
            setSelectedShapes(this.shapeIds);
        } else {
            // If we just added copies, select original targets again?
            setSelectedShapes(this.shapeIds);
        }
    }
}
