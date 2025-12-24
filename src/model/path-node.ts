export class PathNode {
    x: number;
    y: number;
    cpIn: { x: number; y: number };
    cpOut: { x: number; y: number };

    constructor(x: number, y: number, cpInX?: number, cpInY?: number, cpOutX?: number, cpOutY?: number) {
        this.x = x;
        this.y = y;
        this.cpIn = { x: cpInX ?? x, y: cpInY ?? y };
        this.cpOut = { x: cpOutX ?? x, y: cpOutY ?? y };
    }

    translate(dx: number, dy: number): void {
        this.x += dx; this.y += dy;
        this.cpIn.x += dx; this.cpIn.y += dy;
        this.cpOut.x += dx; this.cpOut.y += dy;
    }

    clone(): PathNode {
        return new PathNode(this.x, this.y, this.cpIn.x, this.cpIn.y, this.cpOut.x, this.cpOut.y);
    }

    static fromJSON(json: any): PathNode {
        return new PathNode(json.x, json.y, json.cpIn.x, json.cpIn.y, json.cpOut.x, json.cpOut.y);
    }
}
