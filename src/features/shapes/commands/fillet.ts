import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { Geometry, Point } from '../../../core/math/geometry';
import { PathNode } from '../../../core/types/core'; // Assuming PathNode is here, or I'll fix import
import { cloneDeep } from 'lodash'; // Using lodash if available, or manual clone

// Helper to clone nodes safely
const cloneNodes = (nodes: PathNode[]): PathNode[] => {
    return JSON.parse(JSON.stringify(nodes));
};

export class FilletCornerCommand implements Command {
    private shapeId: string;
    private nodeIndex: number;
    private radius: number;
    private oldNodes: PathNode[] | null = null;

    constructor(shapeId: string, nodeIndex: number, radius: number) {
        this.shapeId = shapeId;
        this.nodeIndex = nodeIndex;
        this.radius = radius;
    }

    execute(): void {
        const { shapes, updateShape } = useStore.getState();
        const shape = shapes.find(s => s.id === this.shapeId);
        if (!shape || !shape.nodes || shape.nodes.length < 3) return;

        // Store original state for undo
        // We only need to store the nodes that change? 
        // Or store all nodes? Storing all is safer/easier for now.
        if (!this.oldNodes) {
            this.oldNodes = cloneNodes(shape.nodes);
        }

        const nodes = cloneNodes(shape.nodes);
        const currentIndex = this.nodeIndex;

        // Handle closed loop indices
        const len = nodes.length;
        const prevIndex = (currentIndex - 1 + len) % len;
        const nextIndex = (currentIndex + 1) % len;

        // If open path and we are at ends, cannot fillet
        if (!shape.closed) {
            if (currentIndex === 0 || currentIndex === len - 1) return;
        }

        const p1 = nodes[prevIndex];
        const p2 = nodes[currentIndex];
        const p3 = nodes[nextIndex];

        // Validate segments are straight lines
        // Check p1->p2: p1.cpOut and p2.cpIn should be null or equal to points
        const isLine1 = (!p1.cpOut || (p1.cpOut.x === p1.x && p1.cpOut.y === p1.y)) &&
            (!p2.cpIn || (p2.cpIn.x === p2.x && p2.cpIn.y === p2.y));

        const isLine2 = (!p2.cpOut || (p2.cpOut.x === p2.x && p2.cpOut.y === p2.y)) &&
            (!p3.cpIn || (p3.cpIn.x === p3.x && p3.cpIn.y === p3.y));

        if (!isLine1 || !isLine2) {
            // Can only fillet straight corners for now
            return;
        }

        const fillet = Geometry.getFilletPoints(p1, p2, p3, this.radius);
        if (!fillet) return;

        // Construct new nodes
        // T1 replaces P2? No, P2 is removed, T1 and T2 inserted.
        // Actually simplest is: Replace P2 with T1, Insert T2 after T1.

        const t1Node: PathNode = {
            x: fillet.start.x,
            y: fillet.start.y,
            type: 'smooth', // It's part of a curve now? No, the corner is the transition.
            // T1 is the end of the line segment P1->T1, and start of the curve T1->T2.
            // So T1 should have cpIn = T1 (line from P1), and cpOut = calculated cp1.
            cpIn: { x: fillet.start.x, y: fillet.start.y },
            cpOut: fillet.cp1
        };

        const t2Node: PathNode = {
            x: fillet.end.x,
            y: fillet.end.y,
            type: 'smooth',
            // T2 is end of curve T1->T2, and start of line T2->P3.
            // So T2 should have cpIn = calculated cp2, and cpOut = T2.
            cpIn: fillet.cp2,
            cpOut: { x: fillet.end.x, y: fillet.end.y }
        };

        // Insert nodes
        if (currentIndex === 0 && shape.closed) {
            // If P2 is index 0. Replaced by T1, T2.
            // But wait, if P2 is 0, prev is last.
            // We replace node 0 with T1, inject T2 at 1.
            nodes[currentIndex] = t1Node;
            nodes.splice(currentIndex + 1, 0, t2Node);
        } else {
            // General case
            nodes[currentIndex] = t1Node;
            nodes.splice(currentIndex + 1, 0, t2Node);
        }

        // Apply changes
        shape.nodes = nodes;
        updateShape(shape);
    }

    undo(): void {
        const { shapes, updateShape } = useStore.getState();
        const shape = shapes.find(s => s.id === this.shapeId);
        if (!shape || !this.oldNodes) return;

        shape.nodes = cloneNodes(this.oldNodes);
        updateShape(shape);
    }
}

export class RemoveRadiusCommand implements Command {
    private shapeId: string;
    private nodeIndex: number;
    private oldNodes: PathNode[] | null = null;

    constructor(shapeId: string, nodeIndex: number) {
        this.shapeId = shapeId;
        this.nodeIndex = nodeIndex;
    }

    execute(): void {
        const { shapes, updateShape } = useStore.getState();
        const shape = shapes.find(s => s.id === this.shapeId);
        if (!shape || !shape.nodes || shape.nodes.length < 3) return;

        // Store original state
        if (!this.oldNodes) {
            this.oldNodes = cloneNodes(shape.nodes);
        }

        const nodes = cloneNodes(shape.nodes);
        const t1Index = this.nodeIndex;

        // T2 is next
        const len = nodes.length;
        const t2Index = (t1Index + 1) % len;

        // Should we validate they are connected?
        // t1 is "start of arc".
        // t2 is "end of arc".
        // P1 is prev of T1.
        // P3 is next of T2.

        if (!shape.closed && (t1Index === 0 || t2Index === 0)) {
            // Cannot remove radius if arc wraps around start/end of open path?
            // If open path, t1Index cannot be last.
            if (t1Index >= len - 1) return;
        }

        const t1 = nodes[t1Index];
        const t2 = nodes[t2Index];
        const prevIndex = (t1Index - 1 + len) % len;
        const nextIndex = (t2Index + 1) % len;

        const p1 = nodes[prevIndex];
        const p3 = nodes[nextIndex];

        // Check vectors
        // Line 1: P1 -> T1.
        // Vector v1 = T1 - P1.
        const v1 = Geometry.sub(t1, p1);

        // Line 2: T2 -> P3.
        // Vector v2 = P3 - T2.
        const v2 = Geometry.sub(p3, t2);

        // Find intersection of Ray(P1, v1) and Ray(T2, v2) ?
        // Actually Geometry.getLineIntersection takes point + vector.
        // Line 1: P1 + t*v1.
        // Line 2: T2 + u*v2. (Use T2 as anchor for second line)

        const intersection = Geometry.getLineIntersection(p1, v1, t2, v2);

        if (!intersection) return; // Parallel lines, can't restore corner

        // Create new corner node
        const cornerNode: PathNode = {
            x: intersection.x,
            y: intersection.y,
            type: 'corner',
            cpIn: { x: intersection.x, y: intersection.y },
            cpOut: { x: intersection.x, y: intersection.y }
        };

        // Remove T2 first (higher index usually, unless wrapping)
        // If wrapping (t1=last, t2=0), index logic is tricky.
        // If closed, and t1 is last, t2 is 0.
        // We replace T1 with Corner, Remove T2.

        if (t2Index === 0 && t1Index === len - 1) {
            // Wrapped case
            // Remove 0 (T2).
            nodes.splice(0, 1);
            // T1 is now at len-2.
            nodes[t1Index - 1] = cornerNode; // Wait, indices shifted.
            // Safer to filter? Or use logic.
            // If we remove T2 (index 0), T1 index is unchanged? No, unchanged.
            // Then we update T1.
        } else if (t2Index > t1Index) {
            // Normal case
            nodes.splice(t2Index, 1);
            nodes[t1Index] = cornerNode;
        } else {
            // Should not happen for sequential nodes unless wrapping handled above
            return;
        }

        shape.nodes = nodes;
        updateShape(shape);
    }

    undo(): void {
        const { shapes, updateShape } = useStore.getState();
        const shape = shapes.find(s => s.id === this.shapeId);
        if (!shape || !this.oldNodes) return;

        shape.nodes = cloneNodes(this.oldNodes);
        updateShape(shape);
    }
}
