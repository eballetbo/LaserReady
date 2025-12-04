export const Geometry = {
    /**
     * Calculates squared Euclidean distance between two points.
     * @param {Object} p1 - {x, y}
     * @param {Object} p2 - {x, y}
     * @returns {number}
     */
    getDistance(p1, p2) {
        return (p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2;
    },

    /**
     * Rotates a point around a center.
     * @param {Object} p - {x, y}
     * @param {Object} center - {x, y}
     * @param {number} angle - in radians
     * @returns {Object} {x, y}
     */
    rotatePoint(p, center, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const dx = p.x - center.x;
        const dy = p.y - center.y;
        return {
            x: center.x + dx * cos - dy * sin,
            y: center.y + dx * sin + dy * cos
        };
    },

    /**
     * Calculates the bounding box of a set of nodes.
     * @param {Array} nodes - Array of objects with {x, y}
     * @returns {Object} Rect {minX, minY, maxX, maxY, width, height, cx, cy}
     */
    calculateBoundingBox(nodes) {
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

    /**
     * Checks if a point is inside or on the stroke of a bezier path.
     * @param {CanvasRenderingContext2D} ctx 
     * @param {Object} shape - {nodes: [], closed: boolean}
     * @param {number} x 
     * @param {number} y 
     * @returns {boolean}
     */
    isPointInBezierPath(ctx, shape, x, y) {
        ctx.save();
        ctx.beginPath();
        if (shape.nodes.length > 0) {
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

    /**
     * Checks if rect1 is fully inside rect2.
     * @param {Object} r1 - {minX, minY, maxX, maxY}
     * @param {Object} r2 - {minX, minY, maxX, maxY}
     * @returns {boolean}
     */
    isRectInRect(r1, r2) {
        return r1.minX >= r2.minX &&
            r1.maxX <= r2.maxX &&
            r1.minY >= r2.minY &&
            r1.maxY <= r2.maxY;
    },

    /**
     * Checks if a shape is fully inside a rectangle.
     * @param {PathShape} shape 
     * @param {Object} rect - {minX, minY, maxX, maxY}
     * @returns {boolean}
     */
    isShapeInRect(shape, rect) {
        const bounds = this.calculateBoundingBox(shape.nodes);
        return this.isRectInRect(bounds, rect);
    },

    /**
     * Checks if a shape intersects or is inside a rectangle.
     * For now, we use bounding box intersection for simplicity.
     * @param {PathShape} shape 
     * @param {Object} rect - {minX, minY, maxX, maxY}
     * @returns {boolean}
     */
    isShapeIntersectingRect(shape, rect) {
        const bounds = this.calculateBoundingBox(shape.nodes);
        return !(bounds.maxX < rect.minX ||
            bounds.minX > rect.maxX ||
            bounds.maxY < rect.minY ||
            bounds.minY > rect.maxY);
    },

    /**
     * Calculates the bounding box of multiple shapes.
     * @param {Array<PathShape>} shapes 
     * @returns {Object} Combined bounds {minX, minY, maxX, maxY, width, height, cx, cy}
     */
    getCombinedBounds(shapes) {
        if (!shapes || shapes.length === 0) return null;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

        shapes.forEach(shape => {
            const b = this.calculateBoundingBox(shape.nodes);
            minX = Math.min(minX, b.minX);
            minY = Math.min(minY, b.minY);
            maxX = Math.max(maxX, b.maxX);
            maxY = Math.max(maxY, b.maxY);
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
