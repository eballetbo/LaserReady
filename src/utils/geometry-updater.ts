import { IShape } from '../features/shapes/types';
import { PathNode } from '../features/shapes/models/node';

/**
 * Updates polygon geometry by recalculating nodes based on center and radius.
 * Mutates the shape's nodes array.
 */
export function updatePolygonGeometry(shape: IShape): void {
    if (shape.type !== 'polygon' || !shape.params || !shape.params.sides || !shape.nodes) {
        return;
    }

    // Calculate center from existing nodes
    let cx = 0, cy = 0;
    shape.nodes.forEach(n => { cx += n.x; cy += n.y; });
    const center = { x: cx / shape.nodes.length, y: cy / shape.nodes.length };

    // Calculate average radius
    let totalRadius = 0;
    shape.nodes.forEach(n => {
        const dx = n.x - center.x;
        const dy = n.y - center.y;
        totalRadius += Math.sqrt(dx * dx + dy * dy);
    });
    const radius = totalRadius / shape.nodes.length;

    // Regenerate nodes based on sides parameter
    const sides = shape.params.sides;
    const newNodes: PathNode[] = [];
    for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
        const x = center.x + radius * Math.cos(angle);
        const y = center.y + radius * Math.sin(angle);
        const node = new PathNode(x, y);
        node.cpIn = { x, y };
        node.cpOut = { x, y };
        newNodes.push(node);
    }

    shape.nodes = newNodes;
}

/**
 * Updates star geometry by recalculating nodes based on center, outer radius, and inner radius ratio.
 * Mutates the shape's nodes array.
 */
export function updateStarGeometry(shape: IShape): void {
    if (shape.type !== 'star' || !shape.params || !shape.params.points || !shape.params.innerRadius || !shape.nodes) {
        return;
    }

    // Calculate center from existing nodes
    let cx = 0, cy = 0;
    shape.nodes.forEach(n => { cx += n.x; cy += n.y; });
    const center = { x: cx / shape.nodes.length, y: cy / shape.nodes.length };

    // Find maximum distance (outer radius)
    let maxDist = 0;
    shape.nodes.forEach(n => {
        const dx = n.x - center.x;
        const dy = n.y - center.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > maxDist) maxDist = dist;
    });

    const outerRadius = maxDist;
    const innerRadius = outerRadius * shape.params.innerRadius;
    const points = shape.params.points;

    // Regenerate nodes alternating between outer and inner radius
    const newNodes: PathNode[] = [];
    for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (i * Math.PI / points) - Math.PI / 2;
        const x = center.x + radius * Math.cos(angle);
        const y = center.y + radius * Math.sin(angle);
        const node = new PathNode(x, y);
        node.cpIn = { x, y };
        node.cpOut = { x, y };
        newNodes.push(node);
    }

    shape.nodes = newNodes;
}

/**
 * Updates shape geometry if it's a polygon or star.
 * Convenience function that calls the appropriate updater.
 */
export function updateShapeGeometry(shape: IShape): void {
    if (shape.type === 'polygon') {
        updatePolygonGeometry(shape);
    } else if (shape.type === 'star') {
        updateStarGeometry(shape);
    }
}
