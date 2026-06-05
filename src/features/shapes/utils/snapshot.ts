import { IShape } from '../types';
import { PathNode } from '../models/node';

/**
 * Opaque snapshot of a shape's geometry state (nodes, position, rotation,
 * children for groups, scale for text). Used by commands for undo/redo.
 */
export interface ShapeSnapshot {
    type: 'group' | 'path' | 'text' | 'other';
    nodes?: PathNode[];
    children?: IShape[];
    x?: number;
    y?: number;
    rotation?: number;
    fontSize?: number;
    scaleX?: number;
    scaleY?: number;
}

export function captureSnapshot(shape: IShape): ShapeSnapshot {
    if (shape.type === 'group') {
        return {
            type: 'group',
            children: shape.children ? shape.children.map(c => {
                const clone = c.clone ? c.clone() : JSON.parse(JSON.stringify(c));
                clone.id = c.id;
                return clone;
            }) : [],
            x: shape.x,
            y: shape.y,
            rotation: shape.rotation,
        };
    }

    if (shape.type === 'text') {
        const t = shape as IShape & { fontSize?: number; scaleX?: number; scaleY?: number };
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
            rotation: shape.rotation,
        };
    }

    return { type: 'other', x: shape.x, y: shape.y, rotation: shape.rotation };
}

export function restoreSnapshot(shape: IShape, snapshot: ShapeSnapshot): void {
    if (snapshot.type === 'group' && shape.type === 'group') {
        shape.children = snapshot.children!.map(c => {
            const clone = c.clone ? c.clone() : JSON.parse(JSON.stringify(c));
            clone.id = c.id;
            return clone;
        });
        shape.x = snapshot.x;
        shape.y = snapshot.y;
        shape.rotation = snapshot.rotation;
    } else if (snapshot.type === 'text') {
        const t = shape as IShape & { fontSize?: number; scaleX?: number; scaleY?: number };
        t.x = snapshot.x;
        t.y = snapshot.y;
        t.rotation = snapshot.rotation;
        t.fontSize = snapshot.fontSize;
        t.scaleX = snapshot.scaleX;
        t.scaleY = snapshot.scaleY;
    } else if (snapshot.type === 'path' && snapshot.nodes && shape.nodes) {
        shape.nodes = snapshot.nodes.map(n => n.clone());
        shape.x = snapshot.x;
        shape.y = snapshot.y;
        shape.rotation = snapshot.rotation;
    } else {
        shape.x = snapshot.x;
        shape.y = snapshot.y;
        shape.rotation = snapshot.rotation;
    }
}
