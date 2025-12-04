import { BaseTool } from './base-tool.js';
import { PathNode } from '../model/path-node.js';
import { PathShape } from '../model/path-shape.js';

export class RectTool extends BaseTool {
    constructor(editor) {
        super(editor);
        this.isDragging = false;
        this.dragStart = null;
    }

    onMouseDown(e) {
        const { x, y } = this.editor.getMousePos(e);
        this.isDragging = true;
        this.dragStart = { x, y };

        const n1 = new PathNode(x, y);
        const n2 = new PathNode(x, y);
        const n3 = new PathNode(x, y);
        const n4 = new PathNode(x, y);
        const newShape = new PathShape([n1, n2, n3, n4], true, {}, 'rect');

        this.editor.shapes.push(newShape);
        this.editor.selectedShape = newShape;
        this.editor.render();
    }

    onMouseMove(e) {
        if (!this.isDragging || !this.editor.selectedShape) return;
        const { x, y } = this.editor.getMousePos(e);

        const w = x - this.dragStart.x;
        const h = y - this.dragStart.y;
        const n = this.editor.selectedShape.nodes;

        n[1].x = this.dragStart.x + w; n[1].y = this.dragStart.y;
        n[2].x = this.dragStart.x + w; n[2].y = this.dragStart.y + h;
        n[3].x = this.dragStart.x; n[3].y = this.dragStart.y + h;

        n.forEach(node => {
            node.cpIn.x = node.x; node.cpIn.y = node.y;
            node.cpOut.x = node.x; node.cpOut.y = node.y;
        });
        this.editor.render();
    }

    onMouseUp(e) {
        this.isDragging = false;
        this.dragStart = null;
    }
}

export class CircleTool extends BaseTool {
    constructor(editor) {
        super(editor);
        this.isDragging = false;
        this.dragStart = null;
    }

    onMouseDown(e) {
        const { x, y } = this.editor.getMousePos(e);
        this.isDragging = true;
        this.dragStart = { x, y };

        const n1 = new PathNode(x, y);
        const n2 = new PathNode(x, y);
        const n3 = new PathNode(x, y);
        const n4 = new PathNode(x, y);
        const newShape = new PathShape([n1, n2, n3, n4], true, {}, 'circle');

        this.editor.shapes.push(newShape);
        this.editor.selectedShape = newShape;
        this.editor.render();
    }

    onMouseMove(e) {
        if (!this.isDragging || !this.editor.selectedShape) return;
        const { x, y } = this.editor.getMousePos(e);

        const rx = Math.abs(x - this.dragStart.x);
        const ry = Math.abs(y - this.dragStart.y);
        const cx = this.dragStart.x;
        const cy = this.dragStart.y;
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

    onMouseUp(e) {
        this.isDragging = false;
        this.dragStart = null;
    }
}

export class PolygonTool extends BaseTool {
    constructor(editor, sides = 6) {
        super(editor);
        this.isDragging = false;
        this.dragStart = null;
        this.sides = sides;
    }

    onMouseDown(e) {
        const { x, y } = this.editor.getMousePos(e);
        this.isDragging = true;
        this.dragStart = { x, y };

        const nodes = [];
        for (let i = 0; i < this.sides; i++) {
            nodes.push(new PathNode(x, y));
        }
        const newShape = new PathShape(nodes, true, {}, 'polygon', { sides: this.sides });

        this.editor.shapes.push(newShape);
        this.editor.selectedShape = newShape;
        this.editor.render();
    }

    onMouseMove(e) {
        if (!this.isDragging || !this.editor.selectedShape) return;
        const { x, y } = this.editor.getMousePos(e);

        const dx = x - this.dragStart.x;
        const dy = y - this.dragStart.y;
        const radius = Math.sqrt(dx * dx + dy * dy);
        const sides = this.sides;
        const n = this.editor.selectedShape.nodes;

        for (let i = 0; i < sides; i++) {
            const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
            n[i].x = this.dragStart.x + radius * Math.cos(angle);
            n[i].y = this.dragStart.y + radius * Math.sin(angle);
            n[i].cpIn = { x: n[i].x, y: n[i].y };
            n[i].cpOut = { x: n[i].x, y: n[i].y };
        }
        this.editor.render();
    }

    onMouseUp(e) {
        this.isDragging = false;
        this.dragStart = null;
    }
}

export class StarTool extends BaseTool {
    constructor(editor, points = 5, innerRadius = 0.382) {
        super(editor);
        this.isDragging = false;
        this.dragStart = null;
        this.points = points;
        this.innerRadius = innerRadius; // Ratio 0-1
    }

    onMouseDown(e) {
        const { x, y } = this.editor.getMousePos(e);
        this.isDragging = true;
        this.dragStart = { x, y };

        const nodes = [];
        for (let i = 0; i < this.points * 2; i++) {
            nodes.push(new PathNode(x, y));
        }
        const newShape = new PathShape(nodes, true, {}, 'star', { points: this.points, innerRadius: this.innerRadius });

        this.editor.shapes.push(newShape);
        this.editor.selectedShape = newShape;
        this.editor.render();
    }

    onMouseMove(e) {
        if (!this.isDragging || !this.editor.selectedShape) return;
        const { x, y } = this.editor.getMousePos(e);

        const dx = x - this.dragStart.x;
        const dy = y - this.dragStart.y;
        const outerRadius = Math.sqrt(dx * dx + dy * dy);
        const innerRadius = outerRadius * this.innerRadius;
        const points = this.points;
        const n = this.editor.selectedShape.nodes;
        const cx = this.dragStart.x;
        const cy = this.dragStart.y;

        for (let i = 0; i < points * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI / points) - Math.PI / 2;
            n[i].x = cx + radius * Math.cos(angle);
            n[i].y = cy + radius * Math.sin(angle);
            n[i].cpIn = { x: n[i].x, y: n[i].y };
            n[i].cpOut = { x: n[i].x, y: n[i].y };
        }
        this.editor.render();
    }

    onMouseUp(e) {
        this.isDragging = false;
        this.dragStart = null;
    }
}
