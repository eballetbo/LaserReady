import { IShape, isGroupShape, isTextShape } from '../types';
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
    if (isGroupShape(shape)) {
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

    if (isTextShape(shape)) {
        return {
            type: 'text',
            x: shape.x,
            y: shape.y,
            rotation: shape.rotation,
            fontSize: shape.fontSize,
            scaleX: shape.scaleX,
            scaleY: shape.scaleY,
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
    if (snapshot.type === 'group' && isGroupShape(shape)) {
        shape.children = snapshot.children!.map(c => {
            const clone = c.clone ? c.clone() : JSON.parse(JSON.stringify(c));
            clone.id = c.id;
            return clone;
        });
        shape.x = snapshot.x;
        shape.y = snapshot.y;
        shape.rotation = snapshot.rotation;
    } else if (snapshot.type === 'text' && isTextShape(shape)) {
        shape.x = snapshot.x;
        shape.y = snapshot.y;
        shape.rotation = snapshot.rotation;
        if (snapshot.fontSize !== undefined) shape.fontSize = snapshot.fontSize;
        shape.scaleX = snapshot.scaleX;
        shape.scaleY = snapshot.scaleY;
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
