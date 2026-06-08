import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { AlignType, AlignReference } from '../types';
import { Geometry, Rect } from '../../../core/math/geometry';
export class AlignCommand implements Command {
    private shapeIds: string[];
    private alignType: AlignType;
    private reference: AlignReference;
    private originalPositions: Map<string, { x: number, y: number }>;
    readonly label = 'Align';

    constructor(shapeIds: string[], type: AlignType, reference: AlignReference = 'selection') {
        this.shapeIds = shapeIds;
        this.alignType = type;
        this.reference = reference;
        this.originalPositions = new Map();
    }

    execute(): void {
        const { shapes, setShapes, material } = useStore.getState();
        const shapesToAlign = shapes.filter(s => this.shapeIds.includes(s.id));

        if (shapesToAlign.length === 0) return;

        // Store original positions for undo
        shapesToAlign.forEach(shape => {
            if (!this.originalPositions.has(shape.id)) {
                // Must handle if shape doesn't have explicit x/y (e.g. path relying on nodes)
                // BUT move() method relies on delta. 
                // We actually don't NEED absolute positions if we only use move().
                // However, Undo needs to move back.
                // Or we can just store the applied delta for each shape.
                // Let's store the total delta applied.

                // WAIT: If we run execute() again (Redo), we need to re-calculate?
                // Or just re-apply the SAME delta?
                // Alignment is state-DEPENDENT. If I move a shape externally, then Redo Align,
                // it should align to the NEW position? 
                // Usually Commands are deterministic based on state AT EXECUTION time.
                // So Redo should re-calculate like Execution.

                // But Undo needs to be the INVERSE of what was done.
                // So I should calculate deltas, apply them, and store them for Undo.
            }
        });

        // Calculate Reference Bounds
        let refBounds: Rect | null = null;

        if (this.reference === 'page') {
            refBounds = {
                minX: 0,
                minY: 0,
                maxX: material.width,
                maxY: material.height,
                width: material.width,
                height: material.height,
                cx: material.width / 2,
                cy: material.height / 2
            };
        } else {
            // Union of all selected shapes
            refBounds = Geometry.getCombinedBounds(shapesToAlign);
        }

        if (!refBounds) return;

        // Calculate and Apply Moves
        const moves: Map<string, { dx: number, dy: number }> = new Map();

        shapesToAlign.forEach(shape => {
            let shapeBounds: Rect | undefined;
            if (shape.getBounds) {
                shapeBounds = shape.getBounds();
            } else if (shape.nodes) {
                // Fallback for shapes without getBounds (though they should have it)
                shapeBounds = Geometry.calculateBoundingBox(shape.nodes);
            }

            if (!shapeBounds) return;

            let dx = 0;
            let dy = 0;

            switch (this.alignType) {
                case 'left':
                    dx = refBounds!.minX - shapeBounds.minX;
                    break;
                case 'center-v':
                    dx = refBounds!.cx! - shapeBounds.cx!;
                    break;
                case 'right':
                    dx = refBounds!.maxX - shapeBounds.maxX;
                    break;
                case 'top':
                    dy = refBounds!.minY - shapeBounds.minY;
                    break;
                case 'center-h':
                    dy = refBounds!.cy! - shapeBounds.cy!;
                    break;
                case 'bottom':
                    dy = refBounds!.maxY - shapeBounds.maxY;
                    break;
            }

            if (dx !== 0 || dy !== 0) {
                shape.move?.(dx, dy);
                moves.set(shape.id, { dx, dy });
            }
        });

        // Store moves for Undo
        // Note: consecutive executes would overwrite if we don't handle it, 
        // but Command instances are typically single-use or reset.
        // We will store this specifically for THIS execution.
        this.originalPositions.clear(); // Reset 
        moves.forEach((delta, id) => {
            this.originalPositions.set(id, { x: delta.dx, y: delta.dy });
        });

        // Update Store
        setShapes([...shapes]);
    }

    undo(): void {
        const { shapes, setShapes } = useStore.getState();
        const shapesToAlign = shapes.filter(s => this.shapeIds.includes(s.id));

        shapesToAlign.forEach(shape => {
            const delta = this.originalPositions.get(shape.id);
            if (delta) {
                shape.move?.(-delta.x, -delta.y);
            }
        });

        setShapes([...shapes]);
    }
}
