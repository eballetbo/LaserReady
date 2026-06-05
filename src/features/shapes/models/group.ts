import { IShape } from '../types';
import { Geometry, Rect } from '../../../core/math/geometry';
import { PathShape } from './path';
import { TextObject } from './text';

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
            if (child.move) {
                child.move(dx, dy);
            } else if (child.nodes) {
                child.x = (child.x || 0) + dx;
                child.y = (child.y || 0) + dy;
                child.nodes.forEach(n => {
                    n.x += dx; n.y += dy;
                    if (n.cpIn) { n.cpIn.x += dx; n.cpIn.y += dy; }
                    if (n.cpOut) { n.cpOut.x += dx; n.cpOut.y += dy; }
                });
            }
        });
    }

    rotate(angle: number, center: { x: number, y: number }): void {
        this.children.forEach(child => {
            if (child.rotate) {
                child.rotate(angle, center);
            }
        });
        this.rotation += angle;
    }

    scale(sx: number, sy: number, center: { x: number, y: number }): void {
        this.children.forEach(child => {
            if (child.scale) {
                child.scale(sx, sy, center);
            }
        });
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

    toJSON(): Record<string, unknown> {
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

    static fromJSON(json: Record<string, unknown>): GroupShape {
        const childrenData = (json.children as Record<string, unknown>[]) || [];
        const children: IShape[] = childrenData.map(c => {
            if (c.type === 'text') return TextObject.fromJSON(c);
            if (c.type === 'group') return GroupShape.fromJSON(c);
            return PathShape.fromJSON(c);
        });

        const group = new GroupShape(children);
        group.id = json.id as string;
        group.layerId = (json.layerId as string) || 'layer-1';
        group.rotation = (json.rotation as number) || 0;
        group.strokeColor = json.strokeColor as string | undefined;
        group.strokeWidth = json.strokeWidth as number | undefined;
        group.fillColor = json.fillColor as string | undefined;
        return group;
    }
}
