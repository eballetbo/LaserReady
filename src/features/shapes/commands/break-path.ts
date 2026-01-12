import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { PathShape } from '../models/path';
import { PathNode } from '../models/node';

export class BreakPathCommand implements Command {
    private shapeId: string;
    private nodeIndex: number;
    private originalShapeState: { nodes: PathNode[], closed: boolean } | null = null;
    private newShapeId: string | null = null; // For Open path split (the second part)

    constructor(shapeId: string, nodeIndex: number) {
        this.shapeId = shapeId;
        this.nodeIndex = nodeIndex;
    }

    execute(): void {
        const { shapes, setShapes } = useStore.getState();
        const shape = shapes.find(s => s.id === this.shapeId) as PathShape;

        if (!shape || !shape.nodes) return;

        // Save state for undo
        this.originalShapeState = {
            nodes: shape.nodes.map(n => n.clone()),
            closed: shape.closed
        };

        if (shape.closed) {
            // CASE 1: Break Closed Loop -> Open Path
            // Reorder nodes so it starts at nodeIndex and ends at nodeIndex (duplicated)

            const nodes = shape.nodes;
            const count = nodes.length;

            // Validate index
            if (this.nodeIndex < 0 || this.nodeIndex >= count) return;

            const after = nodes.slice(this.nodeIndex);

            // Let's operate on clones to be safe and immutable-ish
            const newNodes: PathNode[] = [];

            // Add 'after' part
            after.forEach(n => newNodes.push(n.clone()));

            // Part 1: nodeIndex to end
            for (let i = this.nodeIndex; i < count; i++) {
                newNodes.push(nodes[i].clone());
            }
            // Part 2: 0 to nodeIndex (inclusive)
            for (let i = 0; i <= this.nodeIndex; i++) {
                newNodes.push(nodes[i].clone());
            }

            // Wait, my manual loop logic in previous attempt was slightly redundant with 'after' variable logic?
            // Let's stick to the SIMPLE logic which I verified mentally.
            // Nodes: [0, 1, 2, 3] (Closed). Break at 1.
            // Desired: [1, 2, 3, 0, 1]

            // Re-implement cleanly:
            const cleanNewNodes: PathNode[] = [];

            // 1. From index to end
            for (let i = this.nodeIndex; i < count; i++) {
                cleanNewNodes.push(nodes[i].clone());
            }
            // 2. From 0 to index (inclusive)
            for (let i = 0; i <= this.nodeIndex; i++) {
                cleanNewNodes.push(nodes[i].clone());
            }

            shape.nodes = cleanNewNodes;
            shape.closed = false;

            setShapes([...shapes]);

        } else {
            // CASE 2: Break Open Path -> Two Paths
            // Split at nodeIndex.

            const nodes = shape.nodes;
            if (this.nodeIndex <= 0 || this.nodeIndex >= nodes.length - 1) {
                // Cannot break at start or end of an open path
                return;
            }

            // Shape A: 0 to nodeIndex
            const nodesA = nodes.slice(0, this.nodeIndex + 1).map(n => n.clone());

            // Shape B: nodeIndex to end
            const nodesB = nodes.slice(this.nodeIndex).map(n => n.clone());

            // Update Shape A
            shape.nodes = nodesA;

            // Create Shape B
            const newShape = shape.clone();
            newShape.id = crypto.randomUUID();
            newShape.nodes = nodesB;

            this.newShapeId = newShape.id;

            setShapes([...shapes, newShape]);
        }
    }

    undo(): void {
        const { shapes, setShapes } = useStore.getState();
        const shape = shapes.find(s => s.id === this.shapeId) as PathShape;

        if (!shape || !this.originalShapeState) return;

        // Restore original shape
        shape.nodes = this.originalShapeState.nodes;
        shape.closed = this.originalShapeState.closed;

        let newShapes = [...shapes];

        // If we created a new shape (Open path split), remove it
        if (this.newShapeId) {
            newShapes = newShapes.filter(s => s.id !== this.newShapeId);
            this.newShapeId = null;
        }

        setShapes(newShapes);
    }
}
