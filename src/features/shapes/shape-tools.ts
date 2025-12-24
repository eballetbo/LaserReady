import { BaseTool } from '../../tools/base-tool';
import { PathNode } from './path-node';
import { PathShape } from './path-shape';

interface Point {
    x: number;
    y: number;
}

export class RectTool extends BaseTool {
    isDragging: boolean;
    dragStart: Point | null;

    constructor(editor: any) {
        super(editor);
        this.isDragging = false;
        this.dragStart = null;
    }

    onMouseDown(e: MouseEvent): void {
        const { x, y } = this.editor.getMousePos(e);
        this.isDragging = true;
        this.dragStart = { x, y };

        const n1 = new PathNode(x, y);
        const n2 = new PathNode(x, y);
        const n3 = new PathNode(x, y);
        const n4 = new PathNode(x, y);
        const newShape = new PathShape([n1, n2, n3, n4], true, this.editor.activeLayerId, 'rect');

        this.editor.shapes.push(newShape);
        this.editor.selectedShape = newShape;
        this.editor.render();
    }

    onMouseMove(e: MouseEvent): void {
        if (!this.isDragging || !this.editor.selectedShape) return;
        const { x, y } = this.editor.getMousePos(e);

        let w = x - this.dragStart!.x;
        let h = y - this.dragStart!.y;

        if (e.shiftKey) {
            const d = Math.max(Math.abs(w), Math.abs(h));
            w = d * Math.sign(w || 1);
            h = d * Math.sign(h || 1);
        }

        const n = this.editor.selectedShape.nodes;

        n[1].x = this.dragStart!.x + w; n[1].y = this.dragStart!.y;
        n[2].x = this.dragStart!.x + w; n[2].y = this.dragStart!.y + h;
        n[3].x = this.dragStart!.x; n[3].y = this.dragStart!.y + h;

        n.forEach((node: PathNode) => {
            node.cpIn.x = node.x; node.cpIn.y = node.y;
            node.cpOut.x = node.x; node.cpOut.y = node.y;
        });
        this.editor.render();
    }

    onMouseUp(e: MouseEvent): void {
        this.isDragging = false;
        this.dragStart = null;
    }
}

export class CircleTool extends BaseTool {
    isDragging: boolean;
    dragStart: Point | null;

    constructor(editor: any) {
        super(editor);
        this.isDragging = false;
        this.dragStart = null;
    }

    onMouseDown(e: MouseEvent): void {
        const { x, y } = this.editor.getMousePos(e);
        this.isDragging = true;
        this.dragStart = { x, y };

        const n1 = new PathNode(x, y);
        const n2 = new PathNode(x, y);
        const n3 = new PathNode(x, y);
        const n4 = new PathNode(x, y);
        const newShape = new PathShape([n1, n2, n3, n4], true, this.editor.activeLayerId, 'circle');

        this.editor.shapes.push(newShape);
        this.editor.selectedShape = newShape;
        this.editor.render();
    }

    onMouseMove(e: MouseEvent): void {
        if (!this.isDragging || !this.editor.selectedShape) return;
        const { x, y } = this.editor.getMousePos(e);

        let w = x - this.dragStart!.x;
        let h = y - this.dragStart!.y;

        if (e.shiftKey) {
            const d = Math.max(Math.abs(w), Math.abs(h));
            w = d * Math.sign(w || 1);
            h = d * Math.sign(h || 1);
        }

        const rx = Math.abs(w) / 2;
        const ry = Math.abs(h) / 2;
        const cx = this.dragStart!.x + w / 2;
        const cy = this.dragStart!.y + h / 2;
        const kappa = 0.552284749831;
        const ox = rx * kappa;
        const oy = ry * kappa;

        const n = this.editor.selectedShape.nodes;
        // Top
        n[0].x = cx; n[0].y = cy - ry;
        n[0].cpIn = { x: cx - ox, y: cy - ry };
        n[0].cpOut = { x: cx + ox, y: cy - ry };
        // Right
        n[1].x = cx + rx; n[1].y = cy;
        n[1].cpIn = { x: cx + rx, y: cy - oy };
        n[1].cpOut = { x: cx + rx, y: cy + oy };
        // Bottom
        n[2].x = cx; n[2].y = cy + ry;
        n[2].cpIn = { x: cx + ox, y: cy + ry };
        n[2].cpOut = { x: cx - ox, y: cy + ry };
        // Left
        n[3].x = cx - rx; n[3].y = cy;
        n[3].cpIn = { x: cx - rx, y: cy + oy };
        n[3].cpOut = { x: cx - rx, y: cy - oy };

        this.editor.render();
    }

    onMouseUp(e: MouseEvent): void {
        this.isDragging = false;
        this.dragStart = null;
    }
}

export class PolygonTool extends BaseTool {
    isDragging: boolean;
    dragStart: Point | null;
    sides: number;

    constructor(editor: any, sides: number = 6) {
        super(editor);
        this.isDragging = false;
        this.dragStart = null;
        this.sides = sides;
    }

    onMouseDown(e: MouseEvent): void {
        const { x, y } = this.editor.getMousePos(e);
        this.isDragging = true;
        this.dragStart = { x, y };

        const nodes: PathNode[] = [];
        for (let i = 0; i < this.sides; i++) {
            nodes.push(new PathNode(x, y));
        }
        const newShape = new PathShape(nodes, true, this.editor.activeLayerId, 'polygon', { sides: this.sides });

        this.editor.shapes.push(newShape);
        this.editor.selectedShape = newShape;
        this.editor.render();
    }

    onMouseMove(e: MouseEvent): void {
        if (!this.isDragging || !this.editor.selectedShape) return;
        const { x, y } = this.editor.getMousePos(e);

        let w = x - this.dragStart!.x;
        let h = y - this.dragStart!.y;

        if (e.shiftKey) {
            const d = Math.max(Math.abs(w), Math.abs(h));
            w = d * Math.sign(w || 1);
            h = d * Math.sign(h || 1);
        }

        const rx = Math.abs(w) / 2;
        const ry = Math.abs(h) / 2;
        const cx = this.dragStart!.x + w / 2;
        const cy = this.dragStart!.y + h / 2;
        const sides = this.sides;
        const n = this.editor.selectedShape.nodes;

        for (let i = 0; i < sides; i++) {
            const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
            n[i].x = cx + rx * Math.cos(angle);
            n[i].y = cy + ry * Math.sin(angle);
            n[i].cpIn = { x: n[i].x, y: n[i].y };
            n[i].cpOut = { x: n[i].x, y: n[i].y };
        }
        this.editor.render();
    }

    onMouseUp(e: MouseEvent): void {
        this.isDragging = false;
        this.dragStart = null;
    }
}

export class StarTool extends BaseTool {
    isDragging: boolean;
    dragStart: Point | null;
    points: number;
    innerRadius: number;

    constructor(editor: any, points: number = 5, innerRadius: number = 0.382) {
        super(editor);
        this.isDragging = false;
        this.dragStart = null;
        this.points = points;
        this.innerRadius = innerRadius; // Ratio 0-1
    }

    onMouseDown(e: MouseEvent): void {
        const { x, y } = this.editor.getMousePos(e);
        this.isDragging = true;
        this.dragStart = { x, y };

        const nodes: PathNode[] = [];
        for (let i = 0; i < this.points * 2; i++) {
            nodes.push(new PathNode(x, y));
        }
        const newShape = new PathShape(nodes, true, this.editor.activeLayerId, 'star', { points: this.points, innerRadius: this.innerRadius });

        this.editor.shapes.push(newShape);
        this.editor.selectedShape = newShape;
        this.editor.render();
    }

    onMouseMove(e: MouseEvent): void {
        if (!this.isDragging || !this.editor.selectedShape) return;
        const { x, y } = this.editor.getMousePos(e);

        let w = x - this.dragStart!.x;
        let h = y - this.dragStart!.y;

        if (e.shiftKey) {
            const d = Math.max(Math.abs(w), Math.abs(h));
            w = d * Math.sign(w || 1);
            h = d * Math.sign(h || 1);
        }

        const rx = Math.abs(w) / 2;
        const ry = Math.abs(h) / 2;
        const cx = this.dragStart!.x + w / 2;
        const cy = this.dragStart!.y + h / 2;

        const outerRx = rx;
        const outerRy = ry;
        const innerRx = rx * this.innerRadius;
        const innerRy = ry * this.innerRadius;

        const points = this.points;
        const n = this.editor.selectedShape.nodes;

        for (let i = 0; i < points * 2; i++) {
            const isOuter = i % 2 === 0;
            const rX = isOuter ? outerRx : innerRx;
            const rY = isOuter ? outerRy : innerRy;

            const angle = (i * Math.PI / points) - Math.PI / 2;
            n[i].x = cx + rX * Math.cos(angle);
            n[i].y = cy + rY * Math.sin(angle);
            n[i].cpIn = { x: n[i].x, y: n[i].y };
            n[i].cpOut = { x: n[i].x, y: n[i].y };
        }
        this.editor.render();
    }

    onMouseUp(e: MouseEvent): void {
        this.isDragging = false;
        this.dragStart = null;
    }
}
