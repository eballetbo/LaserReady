import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { PathNode, NodeType } from '../models/node';
import { Geometry } from '../../../core/math/geometry';

export class MoveNodeCommand implements Command {
    private shapeId: string;
    private changes: { index: number; oldNode: PathNode; newNode: PathNode }[];

    constructor(shapeId: string, changes: { index: number; oldNode: PathNode; newNode: PathNode }[] | Map<number, { oldNode: PathNode, newNode: PathNode }>) {
        this.shapeId = shapeId;
        if (changes instanceof Map) {
            this.changes = Array.from(changes.entries()).map(([index, { oldNode, newNode }]) => ({ index, oldNode, newNode }));
        } else {
            this.changes = changes;
        }
    }

    execute(): void {
        const { shapes, setShapes } = useStore.getState();
        const shapeIndex = shapes.findIndex(s => s.id === this.shapeId);
        if (shapeIndex === -1) return;

        const shape = shapes[shapeIndex];
        if (!shape.nodes || !shape.clone) return;

        // Clone to preserve prototype and getBounds
        const newShape = shape.clone();
        newShape.id = shape.id; // Keep same ID

        if (!newShape.nodes) return;

        const nodes = newShape.nodes;
        // Update the nodes in the clone
        this.changes.forEach(({ index, newNode }) => {
            if (index >= 0 && index < nodes.length) {
                const targetNode = nodes[index];
                targetNode.x = newNode.x;
                targetNode.y = newNode.y;
                targetNode.cpIn.x = newNode.cpIn.x;
                targetNode.cpIn.y = newNode.cpIn.y;
                targetNode.cpOut.x = newNode.cpOut.x;
                targetNode.cpOut.y = newNode.cpOut.y;
            }
        });

        const newShapes = [...shapes];
        newShapes[shapeIndex] = newShape;
        setShapes(newShapes);
    }

    undo(): void {
        const { shapes, setShapes } = useStore.getState();
        const shapeIndex = shapes.findIndex(s => s.id === this.shapeId);
        if (shapeIndex === -1) return;

        const shape = shapes[shapeIndex];
        if (!shape.nodes || !shape.clone) return;

        const newShape = shape.clone();
        newShape.id = shape.id;

        if (!newShape.nodes) return;

        const nodes = newShape.nodes;
        this.changes.forEach(({ index, oldNode }) => {
            if (index >= 0 && index < nodes.length) {
                const targetNode = nodes[index];
                targetNode.x = oldNode.x;
                targetNode.y = oldNode.y;
                targetNode.cpIn.x = oldNode.cpIn.x;
                targetNode.cpIn.y = oldNode.cpIn.y;
                targetNode.cpOut.x = oldNode.cpOut.x;
                targetNode.cpOut.y = oldNode.cpOut.y;
            }
        });

        const newShapes = [...shapes];
        newShapes[shapeIndex] = newShape;
        setShapes(newShapes);
    }
}

export class InsertNodeCommand implements Command {
    id: string;
    shapeId: string;
    segmentIndex: number;
    t: number;
    oldNodes: PathNode[];
    newNodes: PathNode[];

    constructor(shapeId: string, segmentIndex: number, t: number) {
        this.id = crypto.randomUUID();
        this.shapeId = shapeId;
        this.segmentIndex = segmentIndex;
        this.t = t;

        const shape = useStore.getState().shapes.find(s => s.id === shapeId);
        if (!shape || !shape.nodes) {
            throw new Error('Shape or nodes not found');
        }

        this.oldNodes = shape.nodes.map((n: any) => n.clone());
        this.newNodes = this.calculateNewNodes(shape, segmentIndex, t);
    }

    private calculateNewNodes(shape: any, index: number, t: number): PathNode[] {
        const nodes = shape.nodes.map((n: any) => PathNode.fromJSON(n));

        const i = index;
        const nextI = (i + 1) % nodes.length;

        // If open shape and trying to insert after last node
        if (!shape.closed && i === nodes.length - 1) {
            return nodes; // Can't insert after last node in open path
        }

        const p0 = nodes[i];
        const p3 = nodes[nextI];

        // Bezier points
        const P0 = { x: p0.x, y: p0.y };
        const P1 = p0.cpOut;
        const P2 = p3.cpIn;
        const P3 = { x: p3.x, y: p3.y };

        const [curve1, curve2] = Geometry.subdivideCubicBezier(P0, P1, P2, P3, t);

        // Update P0 (previous node)
        p0.cpOut = curve1[1];

        // Create New Node
        const newNode = new PathNode(
            curve1[3].x, curve1[3].y,
            curve1[2].x, curve1[2].y, // cpIn
            curve2[1].x, curve2[1].y, // cpOut
            'smooth' // Inserted nodes are usually smooth
        );

        // Update P3 (next node)
        p3.cpIn = curve2[2];

        // Insert newNode at index + 1
        nodes.splice(i + 1, 0, newNode);

        return nodes;
    }

    execute() {
        const shapes = useStore.getState().shapes;
        const shapeIndex = shapes.findIndex(s => s.id === this.shapeId);
        if (shapeIndex === -1) return;

        const shape = shapes[shapeIndex];
        if (!shape.clone) return;

        const newShape = shape.clone();
        newShape.id = shape.id;

        newShape.nodes = this.newNodes;

        const newShapes = [...shapes];
        newShapes[shapeIndex] = newShape;
        useStore.getState().setShapes(newShapes);
    }

    undo() {
        const shapes = useStore.getState().shapes;
        const shapeIndex = shapes.findIndex(s => s.id === this.shapeId);
        if (shapeIndex === -1) return;

        const shape = shapes[shapeIndex];
        if (!shape.clone) return;

        const newShape = shape.clone();
        newShape.id = shape.id;

        newShape.nodes = this.oldNodes;

        const newShapes = [...shapes];
        newShapes[shapeIndex] = newShape;
        useStore.getState().setShapes(newShapes);
    }
}

export class ChangeNodeTypeCommand implements Command {
    id: string;
    shapeId: string;
    nodeIndex: number;
    newType: NodeType;
    oldNode: PathNode;
    newNode: PathNode;

    constructor(shapeId: string, nodeIndex: number, newType: NodeType) {
        this.id = crypto.randomUUID();
        this.shapeId = shapeId;
        this.nodeIndex = nodeIndex;
        this.newType = newType;

        const shape = useStore.getState().shapes.find(s => s.id === shapeId);
        if (!shape || !shape.nodes) {
            throw new Error('Shape or nodes not found');
        }

        this.oldNode = shape.nodes[nodeIndex].clone();
        this.newNode = this.calculateNewNode(shape.nodes, nodeIndex, newType);
    }

    private calculateNewNode(nodes: PathNode[], index: number, type: NodeType): PathNode {
        const node = nodes[index].clone();
        node.type = type;

        if (type === 'corner') {
            return node;
        }

        const p = { x: node.x, y: node.y };
        const cpInPos = node.cpIn;
        const cpOutPos = node.cpOut;

        const lenIn = Math.sqrt(Geometry.getDistance(p, cpInPos));
        const lenOut = Math.sqrt(Geometry.getDistance(p, cpOutPos));

        if (lenIn < 0.1 && lenOut < 0.1) {
            return node;
        }

        const angleOut = Math.atan2(cpOutPos.y - p.y, cpOutPos.x - p.x);

        if (lenIn < 0.1) {
            node.cpIn = {
                x: p.x - (cpOutPos.x - p.x),
                y: p.y - (cpOutPos.y - p.y)
            };
            return node;
        }
        if (lenOut < 0.1) {
            node.cpOut = {
                x: p.x - (cpInPos.x - p.x),
                y: p.y - (cpInPos.y - p.y)
            };
            return node;
        }

        let targetAngle = angleOut;
        let targetLenIn = lenIn;
        let targetLenOut = lenOut;

        if (type === 'symmetric') {
            const avgLen = (lenIn + lenOut) / 2;
            targetLenIn = avgLen;
            targetLenOut = avgLen;
        }

        node.cpOut = {
            x: p.x + Math.cos(targetAngle) * targetLenOut,
            y: p.y + Math.sin(targetAngle) * targetLenOut
        };

        node.cpIn = {
            x: p.x + Math.cos(targetAngle + Math.PI) * targetLenIn,
            y: p.y + Math.sin(targetAngle + Math.PI) * targetLenIn
        };

        return node;
    }

    execute() {
        const shapes = useStore.getState().shapes;
        const shapeIndex = shapes.findIndex(s => s.id === this.shapeId);
        if (shapeIndex === -1) return;

        const newShapes = [...shapes];
        if (!newShapes[shapeIndex].clone) return;
        const newShape = newShapes[shapeIndex].clone();
        newShape.id = newShapes[shapeIndex].id;

        if (newShape.nodes) {
            const newNodes = [...newShape.nodes];
            newNodes[this.nodeIndex] = this.newNode;
            newShape.nodes = newNodes;
            newShapes[shapeIndex] = newShape;
            useStore.getState().setShapes(newShapes);
        }
    }

    undo() {
        const shapes = useStore.getState().shapes;
        const shapeIndex = shapes.findIndex(s => s.id === this.shapeId);
        if (shapeIndex === -1) return;

        const newShapes = [...shapes];
        if (!newShapes[shapeIndex].clone) return;
        const newShape = newShapes[shapeIndex].clone();
        newShape.id = newShapes[shapeIndex].id;

        if (newShape.nodes) {
            const newNodes = [...newShape.nodes];
            newNodes[this.nodeIndex] = this.oldNode;
            newShape.nodes = newNodes;
            newShapes[shapeIndex] = newShape;
            useStore.getState().setShapes(newShapes);
        }
    }
}

export class DeleteNodeCommand implements Command {
    id: string;
    shapeId: string;
    indices: number[];
    oldNodes: PathNode[];
    newNodes: PathNode[];

    constructor(shapeId: string, indices: number | number[]) {
        this.id = crypto.randomUUID();
        this.shapeId = shapeId;
        this.indices = Array.isArray(indices) ? indices : [indices];

        const shape = useStore.getState().shapes.find(s => s.id === shapeId);
        if (!shape || !shape.nodes) {
            throw new Error('Shape or nodes not found');
        }

        this.oldNodes = shape.nodes.map((n: any) => n.clone());
        // Remove nodes at specified indices
        // Important: When deleting multiple, indices shift? 
        // No, we filter based on inclusion in indices list.
        this.newNodes = shape.nodes.filter((_: any, i: number) => !this.indices.includes(i));
    }

    execute() {
        const shapes = useStore.getState().shapes;
        const shapeIndex = shapes.findIndex(s => s.id === this.shapeId);
        if (shapeIndex === -1) return;

        const newShapes = [...shapes];
        if (!newShapes[shapeIndex].clone) return;
        const newShape = newShapes[shapeIndex].clone();
        newShape.id = newShapes[shapeIndex].id;

        if (this.newNodes.length < 2 && !newShape.closed) { // Assuming path needs at least 2 nodes
            // Handle too few nodes case if needed
        }

        newShape.nodes = this.newNodes;
        newShapes[shapeIndex] = newShape;
        useStore.getState().setShapes(newShapes);
    }

    undo() {
        const shapes = useStore.getState().shapes;
        const shapeIndex = shapes.findIndex(s => s.id === this.shapeId);
        if (shapeIndex === -1) return;

        const newShapes = [...shapes];
        if (!newShapes[shapeIndex].clone) return;
        const newShape = newShapes[shapeIndex].clone();
        newShape.id = newShapes[shapeIndex].id;
        newShape.nodes = this.oldNodes;
        newShapes[shapeIndex] = newShape;
        useStore.getState().setShapes(newShapes);
    }
}
