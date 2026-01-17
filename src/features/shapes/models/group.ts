
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
        if (this.children.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, cx: 0, cy: 0 };

        const bounds = Geometry.getCombinedBounds(this.children);
        if (!bounds) {
            return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, cx: 0, cy: 0 };
        }
        return bounds;
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

    rotate(angle: number, center: { x: number, y: number }): void {
        this.children.forEach(child => {
            if (typeof (child as any).rotate === 'function') {
                (child as any).rotate(angle, center);
            }
        });
        // We might want to update this.rotation, but usually it's derived or relative.
        // For now, let's just track it loosely if needed.
        this.rotation += angle;
    }

    scale(sx: number, sy: number, center: { x: number, y: number }): void {
        this.children.forEach(child => {
            if (typeof (child as any).scale === 'function') {
                (child as any).scale(sx, sy, center);
            }
        });
        // Update position? x/y are top-left usually, derived from bounds.
        // We don't strictly maintain x/y for Groups as authoritative, bounds are.
        // But let's update them to be safe via bounds
        const b = this.getBounds();
        this.x = b.minX;
        this.y = b.minY;
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
