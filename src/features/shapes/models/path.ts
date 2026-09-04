import { Geometry, Rect } from '../../../core/math/geometry';
import { PathNode } from './node';
import { ShapeParams } from '../types';

export interface PathStyle {
    strokeColor?: string;
    strokeWidth?: number;
    fillColor?: string;
}

export class PathShape {
    nodes: PathNode[];
    closed: boolean;
    type: string | null;
    params: ShapeParams;
    id: string;
    layerId: string;
    strokeColor?: string;
    strokeWidth?: number;
    fillColor?: string;
    dashArray?: number[];
    opacity?: number;

    constructor(
        nodes: PathNode[] = [],
        closed: boolean = false,
        layerId: string = 'layer-1',
        type: string = 'path',
        params: ShapeParams = {},
        id?: string,
        strokeColor?: string,
        strokeWidth?: number,
        fillColor?: string
    ) {
        this.id = id || crypto.randomUUID();
        this.nodes = nodes;
        this.closed = closed;
        this.layerId = layerId;
        this.type = type;
        this.params = params;
        this.strokeColor = strokeColor;
        this.strokeWidth = strokeWidth;
        this.fillColor = fillColor;
    }

    getBounds(): Rect {
        return Geometry.calculateBoundingBox(this.nodes);
    }

    move(dx: number, dy: number): void {
        this.nodes.forEach(n => n.translate(dx, dy));
    }

    rotate(angle: number, center: { x: number; y: number }): void {
        this.nodes.forEach(n => {
            const p = Geometry.rotatePoint(n, center, angle);
            n.x = p.x; n.y = p.y;

            const cpIn = Geometry.rotatePoint(n.cpIn, center, angle);
            n.cpIn.x = cpIn.x; n.cpIn.y = cpIn.y;

            const cpOut = Geometry.rotatePoint(n.cpOut, center, angle);
            n.cpOut.x = cpOut.x; n.cpOut.y = cpOut.y;
        });
    }

    scale(sx: number, sy: number, center: { x: number; y: number }): void {
        this.nodes.forEach(n => {
            const p = Geometry.scalePoint(n, sx, sy, center);
            n.x = p.x; n.y = p.y;

            const cpIn = Geometry.scalePoint(n.cpIn, sx, sy, center);
            n.cpIn.x = cpIn.x; n.cpIn.y = cpIn.y;

            const cpOut = Geometry.scalePoint(n.cpOut, sx, sy, center);
            n.cpOut.x = cpOut.x; n.cpOut.y = cpOut.y;
        });
    }

    clone(): PathShape {
        const newNodes = this.nodes.map(n => n.clone());
        return new PathShape(
            newNodes,
            this.closed,
            this.layerId,
            this.type || 'path',
            { ...this.params },
            undefined, // New ID
            this.strokeColor,
            this.strokeWidth,
            this.fillColor
        );
    }

    toJSON(): Record<string, unknown> {
        return {
            id: this.id,
            type: this.type,
            closed: this.closed,
            layerId: this.layerId,
            params: this.params,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            fillColor: this.fillColor,
            nodes: this.nodes.map(n => ({
                x: n.x, y: n.y,
                cpIn: { x: n.cpIn.x, y: n.cpIn.y },
                cpOut: { x: n.cpOut.x, y: n.cpOut.y },
                type: n.type
            }))
        };
    }

    static fromJSON(json: Record<string, unknown>): PathShape {
        const nodes = ((json.nodes as Record<string, unknown>[]) || []).map(n => PathNode.fromJSON(n));
        // Fallback: if json.layerId exists use it, else default 'layer-1'
        // If we wanted to preserve old colors we'd need a more complex migration strategy.
        const layerId = (json.layerId as string) || 'layer-1';
        return new PathShape(
            nodes,
            json.closed as boolean,
            layerId,
            json.type as string,
            json.params as Record<string, number | string | boolean | undefined> | undefined,
            json.id as string | undefined,
            json.strokeColor as string | undefined,
            json.strokeWidth as number | undefined,
            json.fillColor as string | undefined
        );
    }
}
