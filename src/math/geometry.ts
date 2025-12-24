import { IShape } from '../types/core';

export interface Point {
    x: number;
    y: number;
}

export interface Rect {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width?: number;
    height?: number;
    cx?: number;
    cy?: number;
}

export const Geometry = {
    getDistance(p1: Point, p2: Point): number {
        return (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
    },

    rotatePoint(p: Point, center: Point, angle: number): Point {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const dx = p.x - center.x;
        const dy = p.y - center.y;
        return {
            x: center.x + dx * cos - dy * sin,
            y: center.y + dx * sin + dy * cos
        };
    },

    calculateBoundingBox(nodes: Point[]): Rect {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        nodes.forEach(n => {
            minX = Math.min(minX, n.x);
            minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x);
            maxY = Math.max(maxY, n.y);
        });
        return {
            minX, minY, maxX, maxY,
            width: maxX - minX,
            height: maxY - minY,
            cx: (minX + maxX) / 2,
            cy: (minY + maxY) / 2
        };
    },

    isPointInBezierPath(ctx: CanvasRenderingContext2D, shape: IShape, x: number, y: number): boolean {
        ctx.save();
        ctx.beginPath();
        if (shape.nodes && shape.nodes.length > 0) {
            ctx.moveTo(shape.nodes[0].x, shape.nodes[0].y);
            for (let i = 0; i < shape.nodes.length; i++) {
                let nextNode;
                if (i === shape.nodes.length - 1) {
                    if (!shape.closed) break;
                    nextNode = shape.nodes[0];
                } else {
                    nextNode = shape.nodes[i + 1];
                }
                ctx.bezierCurveTo(
                    shape.nodes[i].cpOut.x, shape.nodes[i].cpOut.y,
                    nextNode.cpIn.x, nextNode.cpIn.y,
                    nextNode.x, nextNode.y
                );
            }
            if (shape.closed) ctx.closePath();
        }

        const hit = ctx.isPointInPath(x, y) || ctx.isPointInStroke(x, y);
        ctx.restore();
        return hit;
    },

    isRectInRect(r1: Rect, r2: Rect): boolean {
        return r1.minX >= r2.minX &&
            r1.maxX <= r2.maxX &&
            r1.minY >= r2.minY &&
            r1.maxY <= r2.maxY;
    },

    isShapeInRect(shape: any, rect: Rect): boolean {
        let bounds: Rect;
        if (shape.getBounds) {
            bounds = shape.getBounds();
        } else {
            bounds = this.calculateBoundingBox(shape.nodes || []);
        }
        return this.isRectInRect(bounds, rect);
    },

    isShapeIntersectingRect(shape: any, rect: Rect): boolean {
        let bounds: Rect;
        if (shape.getBounds) {
            bounds = shape.getBounds();
        } else {
            bounds = this.calculateBoundingBox(shape.nodes || []);
        }
        return !(bounds.maxX < rect.minX ||
            bounds.minX > rect.maxX ||
            bounds.maxY < rect.minY ||
            bounds.minY > rect.maxY);
    },

    getCombinedBounds(shapes: any[]): Rect | null {
        if (!shapes || shapes.length === 0) return null;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        shapes.forEach(shape => {
            let b: Rect | undefined;
            if (shape.getBounds) {
                b = shape.getBounds();
            } else if (shape.nodes) {
                b = this.calculateBoundingBox(shape.nodes);
            } else {
                return;
            }

            if (b) {
                minX = Math.min(minX, b.minX);
                minY = Math.min(minY, b.minY);
                maxX = Math.max(maxX, b.maxX);
                maxY = Math.max(maxY, b.maxY);
            }
        });

        return {
            minX, minY, maxX, maxY,
            width: maxX - minX,
            height: maxY - minY,
            cx: (minX + maxX) / 2,
            cy: (minY + maxY) / 2
        };
    }
};
