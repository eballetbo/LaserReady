import { IShape } from '../types';

/**
 * Opaque snapshot of a shape's geometry state (nodes, position, rotation,
 * children for groups, scale for text). Used by commands for undo/redo.
 */
export interface ShapeSnapshot {
    type: 'group' | 'path' | 'text' | 'other';
    nodes?: any[];
    children?: any[];
    x?: number;
    y?: number;
    rotation?: number;
    fontSize?: number;
    scaleX?: number;
    scaleY?: number;
}

export function captureSnapshot(shape: IShape): ShapeSnapshot {
    if (shape.type === 'group') {
        const g = shape as any;
        return {
            type: 'group',
            children: g.children ? g.children.map((c: any) => {
                const clone = c.clone ? c.clone() : JSON.parse(JSON.stringify(c));
                clone.id = c.id;
                return clone;
            }) : [],
            x: g.x,
            y: g.y,
            rotation: g.rotation,
        };
    }

    if (shape.type === 'text') {
        const t = shape as any;
        return {
            type: 'text',
            x: t.x,
            y: t.y,
            rotation: t.rotation,
            fontSize: t.fontSize,
            scaleX: t.scaleX,
            scaleY: t.scaleY,
        };
    }

    if (shape.nodes) {
        return {
            type: 'path',
            nodes: shape.nodes.map(n => n.clone()),
            x: shape.x,
            y: shape.y,
            rotation: (shape as any).rotation,
        };
    }

    return { type: 'other', x: shape.x, y: shape.y, rotation: (shape as any).rotation };
}

export function restoreSnapshot(shape: IShape, snapshot: ShapeSnapshot): void {
    if (snapshot.type === 'group' && shape.type === 'group') {
        const g = shape as any;
        g.children = snapshot.children!.map((c: any) => {
            const clone = c.clone ? c.clone() : JSON.parse(JSON.stringify(c));
            clone.id = c.id;
            return clone;
        });
        g.x = snapshot.x;
        g.y = snapshot.y;
        g.rotation = snapshot.rotation;
    } else if (snapshot.type === 'text') {
        const t = shape as any;
        t.x = snapshot.x;
        t.y = snapshot.y;
        t.rotation = snapshot.rotation;
        t.fontSize = snapshot.fontSize;
        t.scaleX = snapshot.scaleX;
        t.scaleY = snapshot.scaleY;
    } else if (snapshot.type === 'path' && snapshot.nodes && shape.nodes) {
        shape.nodes = snapshot.nodes.map((n: any) => n.clone());
        shape.x = snapshot.x;
        shape.y = snapshot.y;
        (shape as any).rotation = snapshot.rotation;
    } else {
        shape.x = snapshot.x;
        shape.y = snapshot.y;
        (shape as any).rotation = snapshot.rotation;
    }
}
