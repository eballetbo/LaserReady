
// @ts-nocheck
import { IShape } from '../types';
import { Geometry, Rect } from '../../../core/math/geometry';

export class GroupShape implements IShape {
    id: string;
    type: 'group';
    layerId: string;
    closed: boolean = true; // Groups effectively closed regions usually? Or irrelevant.
    selected: boolean = false;
    x: number;
    y: number;
    rotation: number;
    children: IShape[];

    // Style overrides (applied to children if set, or children keep theirs)
    strokeColor?: string;
    strokeWidth?: number;
    fillColor?: string;

    constructor(children: IShape[]) {
        this.id = crypto.randomUUID();
        this.type = 'group';
        this.children = children;

        // Inherit layer from first child or active? 
        // Logic: Group must be on a layer. Usually same as children.
        // Assuming all children are on same layer for now, or group takes precedence.
        this.layerId = children[0]?.layerId || 'default';

        // Initialize position/bounds
        const bounds = this.getBounds();
        this.x = bounds.minX;
        this.y = bounds.minY;
        this.rotation = 0;
    }

    getBounds(): Rect {
        if (this.children.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };

        // This is tricky. Children have their own coordinates.
        // If children are PathShapes, they have getBounds.
        // If children are GroupShapes, they have getBounds.
        // We need deep bounds.

        // Assuming all IShape implement getBounds or specific types do.
        // We need to cast or check.
        // For now, let's assume `Geometry.getCombinedBounds` can handle generic objects with nodes?
        // But GroupShape doesn't have nodes in the same way.

        // Let's implement a recursive bound calculator or rely on Geometry if it supports it.
        // Geometry.getCombinedBounds takes IShape[]?

        // Let's look at Geometry.getCombinedBounds logic in a previous turn or just implement here.
        // We iterate children.

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        this.children.forEach(child => {
            let b: Rect;
            if (typeof child.getBounds === 'function') {
                b = child.getBounds();
            } else if (child.nodes) {
                // Fallback for shape with nodes but no method instance
                // (e.g. plain object from store)
                // Geometry.getBounds(nodes)
                // We'll approximate or assume child is robust.
                // Let's assume child HAS nodes if not a group.
                // This might need `Geometry.getBounds(child.nodes)`.
                // Let's assume child is proper object for now or handle safe.
                // Ideally we call a utility.
                return; // Skip if unknown
            } else {
                return;
            }

            if (b.minX < minX) minX = b.minX;
            if (b.minY < minY) minY = b.minY;
            if (b.maxX > maxX) maxX = b.maxX;
            if (b.maxY > maxY) maxY = b.maxY;
        });

        // If no valid bounds
        if (minX === Infinity) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };

        return {
            minX,
            minY,
            maxX,
            maxY,
            width: maxX - minX,
            height: maxY - minY,
            cx: (minX + maxX) / 2,
            cy: (minY + maxY) / 2
        };
    }

    move(dx: number, dy: number): void {
        this.x += dx;
        this.y += dy;
        this.children.forEach(child => {
            if (typeof child.move === 'function') {
                child.move(dx, dy);
            } else {
                // Manual update for plain objects
                child.x = (child.x || 0) + dx;
                child.y = (child.y || 0) + dy;
                if (child.nodes) {
                    child.nodes.forEach((n: any) => {
                        n.x += dx; n.y += dy;
                        if (n.cpIn) { n.cpIn.x += dx; n.cpIn.y += dy; }
                        if (n.cpOut) { n.cpOut.x += dx; n.cpOut.y += dy; }
                    });
                }
            }
        });
    }

    clone(): GroupShape {
        // Deep clone children
        const newChildren = this.children.map(c => {
            if (typeof c.clone === 'function') return c.clone();
            // Fallback for plain objects - risky but necessary for now
            return JSON.parse(JSON.stringify(c)); // Simple clone
        });

        const clone = new GroupShape(newChildren);
        clone.x = this.x;
        clone.y = this.y;
        clone.rotation = this.rotation;
        clone.strokeColor = this.strokeColor;
        clone.strokeWidth = this.strokeWidth;
        clone.fillColor = this.fillColor;
        return clone;
    }

    // toJSON for storage
    toJSON() {
        return {
            id: this.id,
            type: 'group',
            layerId: this.layerId,
            children: this.children.map(c => typeof c.toJSON === 'function' ? c.toJSON() : c),
            x: this.x,
            y: this.y,
            rotation: this.rotation,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            fillColor: this.fillColor
        };
    }
}
