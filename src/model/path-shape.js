import { Geometry } from '../math/geometry.js';
import { PathNode } from './path-node.js';

export class PathShape {
    constructor(nodes = [], closed = false, style = {}, type = null, params = {}) {
        this.nodes = nodes;
        this.closed = closed;
        this.strokeColor = style.strokeColor;
        this.strokeWidth = style.strokeWidth;
        this.fillColor = style.fillColor;
        this.type = type;
        this.params = params;
    }

    getBounds() {
        return Geometry.calculateBoundingBox(this.nodes);
    }

    move(dx, dy) {
        this.nodes.forEach(n => n.translate(dx, dy));
    }

    rotate(angle, center) {
        this.nodes.forEach(n => {
            const p = Geometry.rotatePoint(n, center, angle);
            n.x = p.x; n.y = p.y;

            const cpIn = Geometry.rotatePoint(n.cpIn, center, angle);
            n.cpIn.x = cpIn.x; n.cpIn.y = cpIn.y;

            const cpOut = Geometry.rotatePoint(n.cpOut, center, angle);
            n.cpOut.x = cpOut.x; n.cpOut.y = cpOut.y;
        });
    }

    scale(sx, sy, center) {
        this.nodes.forEach(n => {
            n.x = center.x + (n.x - center.x) * sx;
            n.y = center.y + (n.y - center.y) * sy;

            n.cpIn.x = center.x + (n.cpIn.x - center.x) * sx;
            n.cpIn.y = center.y + (n.cpIn.y - center.y) * sy;

            n.cpOut.x = center.x + (n.cpOut.x - center.x) * sx;
            n.cpOut.y = center.y + (n.cpOut.y - center.y) * sy;
        });
    }

    clone() {
        const newNodes = this.nodes.map(n => n.clone());
        return new PathShape(newNodes, this.closed, {
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            fillColor: this.fillColor
        }, this.type, { ...this.params });
    }

    static fromJSON(json) {
        const nodes = json.nodes.map(n => PathNode.fromJSON(n));
        return new PathShape(nodes, json.closed, {
            strokeColor: json.strokeColor,
            strokeWidth: json.strokeWidth,
            fillColor: json.fillColor
        }, json.type, json.params);
    }
}
