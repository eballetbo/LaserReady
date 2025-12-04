export class PathNode {
    constructor(x, y, cpInX, cpInY, cpOutX, cpOutY) {
        this.x = x;
        this.y = y;
        this.cpIn = { x: cpInX ?? x, y: cpInY ?? y };
        this.cpOut = { x: cpOutX ?? x, y: cpOutY ?? y };
    }

    translate(dx, dy) {
        this.x += dx; this.y += dy;
        this.cpIn.x += dx; this.cpIn.y += dy;
        this.cpOut.x += dx; this.cpOut.y += dy;
    }

    clone() {
        return new PathNode(this.x, this.y, this.cpIn.x, this.cpIn.y, this.cpOut.x, this.cpOut.y);
    }

    static fromJSON(json) {
        return new PathNode(json.x, json.y, json.cpIn.x, json.cpIn.y, json.cpOut.x, json.cpOut.y);
    }
}
