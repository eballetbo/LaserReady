
import { BaseTool, IEditorContext } from '../../../core/tools/base';
import { useStore } from '../../../store/useStore';
import { offsetShape } from '../../../core/math/offset';
import { PathShape } from '../models/path';
import { IShape } from '../types';
import { OffsetCommand } from '../commands/offset';
import { Geometry } from '../../../core/math/geometry';

interface OffsetPreviewCache {
    shapeId: string;
    distance: number;
    join: string;
    results: { nodes: { x: number; y: number; cpIn: { x: number; y: number }; cpOut: { x: number; y: number } }[]; closed: boolean }[];
}

export class OffsetTool extends BaseTool {
    hoveredShape: IShape | null = null;
    hoveredShapeState: PathShape | null = null;
    private previewCache: OffsetPreviewCache | null = null;

    constructor(editor: IEditorContext) {
        super(editor);
    }

    onActivate(): void {
        this.editor.canvas.style.cursor = 'crosshair';
        this.editor.render();
    }

    onDeactivate(): void {
        this.hoveredShape = null;
        this.hoveredShapeState = null;
        this.previewCache = null;
        this.editor.canvas.style.cursor = 'default';
        this.editor.render();
    }

    onMouseMove(e: MouseEvent): void {
        const { x, y } = this.editor.getMousePos(e);

        let newHover: IShape | null = null;

        // Find top-most shape
        for (let i = this.editor.shapes.length - 1; i >= 0; i--) {
            const shape = this.editor.shapes[i];
            if (this.hitTestShape(shape, x, y)) {
                newHover = shape;
                break;
            }
        }

        if (newHover !== this.hoveredShape) {
            this.hoveredShape = newHover;
            this.previewCache = null;

            if (this.hoveredShape) {
                if (this.hoveredShape instanceof PathShape) {
                    this.hoveredShapeState = this.hoveredShape;
                } else if (this.hoveredShape.nodes) {
                    this.hoveredShapeState = PathShape.fromJSON(this.hoveredShape);
                } else {
                    this.hoveredShapeState = null;
                }
            } else {
                this.hoveredShapeState = null;
            }

            this.editor.render();
        }
    }

    onMouseDown(e: MouseEvent): void {
        if (!this.hoveredShape) return;

        const { offsetDistance, offsetJoin } = useStore.getState();

        // Correct Constructor: OffsetCommand(shapeIds, options)
        const command = new OffsetCommand(
            [this.hoveredShape.id],
            {
                distance: offsetDistance,
                copies: true, // Always copy for tool click? Or replace? 
                // User said "accept the new offset path", implies adding a new one.
                // Fillet usually modifies in place. Offset usually creates new.
                // Let's default to copies=true for now.
                join: offsetJoin
            }
        );

        this.editor.history.execute(command);
        this.editor.render();
    }

    drawOverlay(ctx: CanvasRenderingContext2D): void {
        if (!this.hoveredShape || !this.hoveredShapeState) return;

        const { offsetDistance, offsetJoin } = useStore.getState();
        const zoom = this.editor.zoom;
        const pan = this.editor.pan;

        const cache = this.previewCache;
        let results: OffsetPreviewCache['results'];

        if (cache && cache.shapeId === this.hoveredShape.id && cache.distance === offsetDistance && cache.join === offsetJoin) {
            results = cache.results;
        } else {
            try {
                results = offsetShape(this.hoveredShapeState, offsetDistance, { join: offsetJoin });
                this.previewCache = { shapeId: this.hoveredShape.id, distance: offsetDistance, join: offsetJoin, results };
            } catch {
                return;
            }
        }

        ctx.save();
        ctx.translate(pan.x, pan.y);
        ctx.scale(zoom, zoom);

        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2 / zoom;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        results.forEach(res => {
            ctx.beginPath();
            if (res.nodes.length > 0) {
                const start = res.nodes[0];
                ctx.moveTo(start.x, start.y);
                const limit = res.closed ? res.nodes.length : res.nodes.length - 1;
                for (let i = 0; i < limit; i++) {
                    const curr = res.nodes[i];
                    const next = res.nodes[(i + 1) % res.nodes.length];
                    ctx.bezierCurveTo(
                        curr.cpOut.x, curr.cpOut.y,
                        next.cpIn.x, next.cpIn.y,
                        next.x, next.y
                    );
                }
            }
            if (res.closed) ctx.closePath();
            ctx.stroke();
        });

        ctx.restore();
    }

    private hitTestShape(shape: IShape, x: number, y: number): boolean {
        if (shape.type === 'group') {
            const group = shape as any;
            if (group.children) {
                return group.children.some((c: any) => this.hitTestShape(c, x, y));
            }
            return false;
        }

        // Use Geometry util if available since we have ctx in editor
        if (Geometry.isPointInBezierPath) {
            const tolerance = 5 / this.editor.zoom;
            return Geometry.isPointInBezierPath(this.editor.ctx, shape, x, y, tolerance);
        }

        // Fallback to bounds if util missing (shouldn't happen)
        const bounds = shape.getBounds ? shape.getBounds() : null;
        if (bounds) {
            return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
        }
        return false;
    }
}
