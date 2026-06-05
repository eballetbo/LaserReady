import { BaseTool, IEditorContext } from '../../../core/tools/base';
import { Geometry } from '../../../core/math/geometry';
import { FilletCornerCommand } from '../commands/fillet';
import { useStore } from '../../../store/useStore';

export class FilletTool extends BaseTool {
    private hoveredShapeId: string | null = null;
    private hoveredNodeIndex: number | null = null;

    constructor(editor: IEditorContext) {
        super(editor);
    }

    onMouseDown(e: MouseEvent): void {
        this.editor.getMousePos(e);

        if (this.hoveredShapeId && this.hoveredNodeIndex !== null) {
            const radius = useStore.getState().filletRadius;
            if (radius <= 0) return;

            if (!this.canFillet(this.hoveredShapeId, this.hoveredNodeIndex, radius)) return;

            const command = new FilletCornerCommand(
                this.hoveredShapeId,
                this.hoveredNodeIndex,
                radius
            );
            this.editor.history.execute(command);
            this.editor.render();
        }
    }

    private canFillet(shapeId: string, nodeIndex: number, radius: number): boolean {
        const shape = this.editor.shapes.find(s => s.id === shapeId);
        if (!shape || !shape.nodes || shape.nodes.length < 3) return false;

        const len = shape.nodes.length;
        if (!shape.closed && (nodeIndex === 0 || nodeIndex === len - 1)) return false;

        const prevIdx = (nodeIndex - 1 + len) % len;
        const nextIdx = (nodeIndex + 1) % len;
        const p1 = shape.nodes[prevIdx];
        const p2 = shape.nodes[nodeIndex];
        const p3 = shape.nodes[nextIdx];

        const isLine1 = (!p1.cpOut || (p1.cpOut.x === p1.x && p1.cpOut.y === p1.y)) &&
            (!p2.cpIn || (p2.cpIn.x === p2.x && p2.cpIn.y === p2.y));
        const isLine2 = (!p2.cpOut || (p2.cpOut.x === p2.x && p2.cpOut.y === p2.y)) &&
            (!p3.cpIn || (p3.cpIn.x === p3.x && p3.cpIn.y === p3.y));
        if (!isLine1 || !isLine2) return false;

        return Geometry.getFilletPoints(p1, p2, p3, radius) !== null;
    }

    onMouseMove(e: MouseEvent): void {
        const { x, y } = this.editor.getMousePos(e);
        this.editor.canvas.style.cursor = 'default';

        // Hit test shapes nodes
        this.hoveredShapeId = null;
        this.hoveredNodeIndex = null;

        const handleRadius = this.editor.config.handleRadius / this.editor.zoom;
        const tol2 = (handleRadius * 2) ** 2; // Hit tolerance 

        // Iterate shapes (top to bottom)
        for (let i = this.editor.shapes.length - 1; i >= 0; i--) {
            const shape = this.editor.shapes[i];

            // Allow any shape that has nodes (paths, rects, polys)
            if (!shape.nodes) continue;

            // Should likely check if ISHAPE bounds are close first? 
            if (shape.getBounds && !Geometry.isPointInBezierPath(this.editor.ctx, shape, x, y, 20 / this.editor.zoom)) {
                // If not even close to the shape, skip detailed node checking? 
                // Wait, nodes can be far from "fill" if stroke only?
                // Let's just check nodes.
            }

            for (let n = 0; n < shape.nodes.length; n++) {
                const node = shape.nodes[n];
                const dist2 = (node.x - x) ** 2 + (node.y - y) ** 2;

                if (dist2 <= tol2) {
                    // Check if node is a corner (candidates must be corners for now)
                    // We rely on visual types or just geometry?
                    // Let's rely on standard check: Segments in/out must be line-like
                    // We can duplicate the check from Command here to show preview only if valid.

                    // Simple check: Is it a sharp corner?
                    // Usually we don't fillet smooth nodes.
                    // But if it's "corner" type but has handles?
                    // For now, allow picking any node that looks like a corner.

                    this.hoveredShapeId = shape.id;
                    this.hoveredNodeIndex = n;
                    this.editor.canvas.style.cursor = 'cell'; // Visually distinct
                    break;
                }
            }
            if (this.hoveredShapeId) break;
        }

        this.editor.render();

        // Draw Overlay if hovering
        if (this.hoveredShapeId && this.hoveredNodeIndex !== null) {
            this.drawPreview(this.editor.ctx);
        }
    }

    private drawPreview(ctx: CanvasRenderingContext2D): void {
        if (!this.hoveredShapeId || this.hoveredNodeIndex === null) return;

        const shape = this.editor.shapes.find(s => s.id === this.hoveredShapeId);
        if (!shape || !shape.nodes) return;

        const idx = this.hoveredNodeIndex;
        const radius = useStore.getState().filletRadius;

        // Need to calculate current preview geometry
        // We reuse logic? 
        // We need P1, P2, P3.
        const len = shape.nodes.length;
        const p2 = shape.nodes[idx];
        const prevIdx = (idx - 1 + len) % len;
        const nextIdx = (idx + 1) % len;

        if (!shape.closed) {
            if (idx === 0 || idx === len - 1) return;
        }

        const p1 = shape.nodes[prevIdx];
        const p3 = shape.nodes[nextIdx];

        const filletPoints = Geometry.getFilletPoints(p1, p2, p3, radius);

        if (filletPoints) {
            ctx.save();

            // Apply camera transform to draw in world space
            const { x: panX, y: panY } = this.editor.pan;
            const zoom = this.editor.zoom;
            ctx.translate(panX, panY);
            ctx.scale(zoom, zoom);

            ctx.strokeStyle = '#00ff00'; // Green preview
            ctx.lineWidth = 2 / zoom;
            ctx.beginPath();

            // Draw the arc
            ctx.moveTo(filletPoints.start.x, filletPoints.start.y);
            ctx.bezierCurveTo(
                filletPoints.cp1.x, filletPoints.cp1.y,
                filletPoints.cp2.x, filletPoints.cp2.y,
                filletPoints.end.x, filletPoints.end.y
            );
            ctx.stroke();

            // Highlight cuts
            ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
            // Draw cut lines? P2 to T1, P2 to T2.
            ctx.beginPath();
            ctx.moveTo(p2.x, p2.y);
            ctx.lineTo(filletPoints.start.x, filletPoints.start.y);
            ctx.moveTo(p2.x, p2.y);
            ctx.lineTo(filletPoints.end.x, filletPoints.end.y);
            ctx.stroke();

            ctx.restore();
        }
    }

    onKeyDown(): void {
        // Handle shortcuts?
    }
}
