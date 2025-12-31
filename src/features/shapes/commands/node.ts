import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { PathNode, NodeType } from '../models/node';
import { Geometry } from '../../../core/math/geometry';

export class MoveNodeCommand implements Command {
    private shapeId: string;
    private nodeIndex: number;
    private oldNode: PathNode;
    private newNode: PathNode;

    constructor(shapeId: string, nodeIndex: number, oldNode: PathNode, newNode: PathNode) {
        this.shapeId = shapeId;
        this.nodeIndex = nodeIndex;
        this.oldNode = oldNode;
        this.newNode = newNode;
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

        // Update the node in the clone
        const targetNode = newShape.nodes[this.nodeIndex];
        targetNode.x = this.newNode.x;
        targetNode.y = this.newNode.y;
        targetNode.cpIn.x = this.newNode.cpIn.x;
        targetNode.cpIn.y = this.newNode.cpIn.y;
        targetNode.cpOut.x = this.newNode.cpOut.x;
        targetNode.cpOut.y = this.newNode.cpOut.y;

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

        const targetNode = newShape.nodes[this.nodeIndex];
        targetNode.x = this.oldNode.x;
        targetNode.y = this.oldNode.y;
        targetNode.cpIn.x = this.oldNode.cpIn.x;
        targetNode.cpIn.y = this.oldNode.cpIn.y;
        targetNode.cpOut.x = this.oldNode.cpOut.x;
        targetNode.cpOut.y = this.oldNode.cpOut.y;

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

        const shape = useStore.getState().shapes.find((s: any) => s.id === shapeId);
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
        const shapeIndex = shapes.findIndex((s: any) => s.id === this.shapeId);
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
        const shapeIndex = shapes.findIndex((s: any) => s.id === this.shapeId);
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

        const shape = useStore.getState().shapes.find((s: any) => s.id === shapeId);
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
        const newShape = { ...newShapes[shapeIndex] };

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
        const newShape = { ...newShapes[shapeIndex] };

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
    nodeIndex: number;
    oldNodes: PathNode[];
    newNodes: PathNode[];

    constructor(shapeId: string, nodeIndex: number) {
        this.id = crypto.randomUUID();
        this.shapeId = shapeId;
        this.nodeIndex = nodeIndex;

        const shape = useStore.getState().shapes.find((s: any) => s.id === shapeId);
        if (!shape || !shape.nodes) {
            throw new Error('Shape or nodes not found');
        }

        this.oldNodes = shape.nodes.map((n: any) => n.clone());
        this.newNodes = shape.nodes.filter((_: any, i: number) => i !== nodeIndex);
    }

    execute() {
        const shapes = useStore.getState().shapes;
        const shapeIndex = shapes.findIndex((s: any) => s.id === this.shapeId);
        if (shapeIndex === -1) return;

        const newShapes = [...shapes];
        const newShape = { ...newShapes[shapeIndex] };

        if (this.newNodes.length < 2) {
            // Option: delete shape if < 2 nodes? Or just keep it.
        }

        newShape.nodes = this.newNodes;
        newShapes[shapeIndex] = newShape;
        useStore.getState().setShapes(newShapes);
    }

    undo() {
        const shapes = useStore.getState().shapes;
        const shapeIndex = shapes.findIndex((s: any) => s.id === this.shapeId);
        if (shapeIndex === -1) return;

        const newShapes = [...shapes];
        const newShape = { ...newShapes[shapeIndex] };
        newShape.nodes = this.oldNodes;
        newShapes[shapeIndex] = newShape;
        useStore.getState().setShapes(newShapes);
    }
}
