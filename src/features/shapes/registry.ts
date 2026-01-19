import { BaseTool } from '../../core/tools/base';
import { PathNode } from './models/node';
import { PathShape } from './models/path';
import { CreateShapeCommand } from './commands/create';

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

    onMouseUp(_e: MouseEvent): void {
        this.isDragging = false;
        this.dragStart = null;

        if (this.editor.selectedShape) {
            // Remove the temporary shape directly from store first
            // This is necessary because we added it directly in onMouseDown
            const currentShapes = this.editor.shapes;
            const index = currentShapes.indexOf(this.editor.selectedShape);
            if (index > -1) {
                // Silently remove from array to avoid double-add when executing command
                // Note: We need to use setter to update store if we want to be clean,
                // but here we just want to hand it over to Command.
                // Actually, cleaner way:
                // Command.execute() adds it.
                // So we should remove it from the "live" array before calling history.execute

                // We must update the store to remove it physically
                this.editor.shapes = currentShapes.filter((s: any) => s.id !== this.editor.selectedShape.id);
            }

            // Now execute command to add it back (and push to history)
            const command = new CreateShapeCommand(this.editor.selectedShape);
            this.editor.history.execute(command);

            // Clear temporary selection to prevent duplicate history entries on subsequent events
            this.editor.selectedShape = null;
        }
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

    onMouseUp(_: MouseEvent): void {
        this.isDragging = false;
        this.dragStart = null;
        if (this.editor.selectedShape) {
            const currentShapes = this.editor.shapes;
            this.editor.shapes = currentShapes.filter((s: any) => s.id !== this.editor.selectedShape.id);
            const command = new CreateShapeCommand(this.editor.selectedShape);
            this.editor.history.execute(command);
            this.editor.selectedShape = null;
        }
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

        const sides = this.sides;
        const n = this.editor.selectedShape.nodes;

        // Calculate unit polygon vertices (radius 1, centered at 0)
        // Note: We use the same angle logic as before to preserve orientation
        const unitPoints: Point[] = [];
        let uMinX = Infinity, uMinY = Infinity, uMaxX = -Infinity, uMaxY = -Infinity;

        for (let i = 0; i < sides; i++) {
            const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
            const px = Math.cos(angle);
            const py = Math.sin(angle);
            unitPoints.push({ x: px, y: py });
            uMinX = Math.min(uMinX, px);
            uMinY = Math.min(uMinY, py);
            uMaxX = Math.max(uMaxX, px);
            uMaxY = Math.max(uMaxY, py);
        }

        const uW = uMaxX - uMinX;
        const uH = uMaxY - uMinY;

        // Map unit polygon vertices to the drag bounding box.
        // This ensures the shape's bounds exactly match the drag area, allowing "Fit to Bounds" behavior.
        const destX = this.dragStart!.x;
        const destY = this.dragStart!.y;

        for (let i = 0; i < sides; i++) {
            const up = unitPoints[i];
            // Normalize to 0..1 relative to its own bounds
            const relX = (up.x - uMinX) / (uW || 1); // Avoid div zero
            const relY = (up.y - uMinY) / (uH || 1);

            n[i].x = destX + relX * w;
            n[i].y = destY + relY * h;

            n[i].cpIn = { x: n[i].x, y: n[i].y };
            n[i].cpOut = { x: n[i].x, y: n[i].y };
        }
        this.editor.render();
    }

    onMouseUp(_: MouseEvent): void {
        this.isDragging = false;
        this.dragStart = null;
        if (this.editor.selectedShape) {
            const currentShapes = this.editor.shapes;
            this.editor.shapes = currentShapes.filter((s: any) => s.id !== this.editor.selectedShape.id);
            const command = new CreateShapeCommand(this.editor.selectedShape);
            this.editor.history.execute(command);
            this.editor.selectedShape = null;
        }
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
        this.innerRadius = innerRadius; // Ratio 0-1 relative to outer radius
    }

    onMouseDown(e: MouseEvent): void {
        const { x, y } = this.editor.getMousePos(e);
        this.isDragging = true;
        this.dragStart = { x, y };

        // Initial shape with 0 radius at click point
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
        if (!this.isDragging || !this.editor.selectedShape || !this.dragStart) return;
        const { x, y } = this.editor.getMousePos(e);

        // Center-to-Tip Logic
        // Center is dragStart
        const cx = this.dragStart.x;
        const cy = this.dragStart.y;

        // Vector from Center to Mouse
        const dx = x - cx;
        const dy = y - cy;

        // Radius is distance
        const radius = Math.sqrt(dx * dx + dy * dy);

        // Rotation is angle of mouse vector
        // We want the first point (i=0) to align with this angle
        const rotation = Math.atan2(dy, dx);

        const points = this.points;
        const n = this.editor.selectedShape.nodes;

        // Generate points
        for (let i = 0; i < points * 2; i++) {
            const isOuter = i % 2 === 0;
            const r = isOuter ? radius : radius * this.innerRadius;

            // Angle mapping:
            // i=0 is Outer, angle = rotation.
            // i=1 is Inner
            // Step is PI / points
            const angle = rotation + i * (Math.PI / points);

            n[i].x = cx + r * Math.cos(angle);
            n[i].y = cy + r * Math.sin(angle);

            // Star lines are straight, so handles are at vertices
            n[i].cpIn = { x: n[i].x, y: n[i].y };
            n[i].cpOut = { x: n[i].x, y: n[i].y };
        }

        this.editor.render();
    }

    onMouseUp(_: MouseEvent): void {
        this.isDragging = false;
        this.dragStart = null;
        if (this.editor.selectedShape) {
            const currentShapes = this.editor.shapes;
            this.editor.shapes = currentShapes.filter((s: any) => s.id !== this.editor.selectedShape.id);
            const command = new CreateShapeCommand(this.editor.selectedShape);
            this.editor.history.execute(command);
            this.editor.selectedShape = null;
        }
    }
}
