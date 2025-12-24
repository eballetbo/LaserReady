import { Geometry } from '../math/geometry.js';
import { PathNode } from './path-node';

export interface PathStyle {
    strokeColor?: string;
    strokeWidth?: number;
    fillColor?: string;
}

export class PathShape {
    nodes: PathNode[];
    closed: boolean;
    type: string | null;
    params: Record<string, any>;
    id: string;
    layerId: string;

    constructor(
        nodes: PathNode[] = [],
        closed: boolean = false,
        layerId: string = 'layer-1', // Default to layer-1
        type: string | null = null,
        params: Record<string, any> = {},
        id?: string
    ) {
        this.id = id || crypto.randomUUID();
        this.nodes = nodes;
        this.closed = closed;
        this.layerId = layerId;
        this.type = type;
        this.params = params;
    }

    getBounds(): any {
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
            n.x = center.x + (n.x - center.x) * sx;
            n.y = center.y + (n.y - center.y) * sy;

            n.cpIn.x = center.x + (n.cpIn.x - center.x) * sx;
            n.cpIn.y = center.y + (n.cpIn.y - center.y) * sy;

            n.cpOut.x = center.x + (n.cpOut.x - center.x) * sx;
            n.cpOut.y = center.y + (n.cpOut.y - center.y) * sy;
        });
    }

    clone(): PathShape {
        const newNodes = this.nodes.map(n => n.clone());
        return new PathShape(newNodes, this.closed, this.layerId, this.type, { ...this.params });
    }

    static fromJSON(json: any): PathShape {
        const nodes = (json.nodes || []).map((n: any) => PathNode.fromJSON(n));
        // Fallback: if json.layerId exists use it, else default 'layer-1'
        // If we wanted to preserve old colors we'd need a more complex migration strategy.
        const layerId = json.layerId || 'layer-1';
        return new PathShape(nodes, json.closed, layerId, json.type, json.params, json.id);
    }
}
