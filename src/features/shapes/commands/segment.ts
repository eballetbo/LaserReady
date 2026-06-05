import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { PathNode } from '../models/node';

export class ConvertSegmentToLineCommand implements Command {
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
        this.newNodes = this.calculateNewNodes(shape, nodeIndex);
    }

    private calculateNewNodes(shape: any, index: number): PathNode[] {
        const newNodes = shape.nodes.map((n: any) => n.clone());

        if (!shape.closed && index === newNodes.length - 1) return newNodes;

        const startNode = newNodes[index];
        const nextIndex = (index + 1) % newNodes.length;
        const endNode = newNodes[nextIndex];

        startNode.cpOut = { x: startNode.x, y: startNode.y };
        endNode.cpIn = { x: endNode.x, y: endNode.y };

        if (startNode.type === 'smooth' || startNode.type === 'symmetric') {
            startNode.type = 'corner';
        }
        if (endNode.type === 'smooth' || endNode.type === 'symmetric') {
            endNode.type = 'corner';
        }

        return newNodes;
    }

    execute() {
        const shapes = useStore.getState().shapes;
        const shapeIndex = shapes.findIndex(s => s.id === this.shapeId);
        if (shapeIndex === -1) return;

        const shape = shapes[shapeIndex];
        if (!shape.nodes || !shape.clone) return;

        const newShapes = [...shapes];
        const newShape = shape.clone();
        newShape.id = this.shapeId;
        newShape.nodes = this.newNodes;
        newShapes[shapeIndex] = newShape;
        useStore.getState().setShapes(newShapes);
    }

    undo() {
        const shapes = useStore.getState().shapes;
        const shapeIndex = shapes.findIndex(s => s.id === this.shapeId);
        if (shapeIndex === -1) return;

        const shape = shapes[shapeIndex];
        if (!shape.nodes || !shape.clone) return;

        const newShapes = [...shapes];
        const newShape = shape.clone();
        newShape.id = this.shapeId;
        newShape.nodes = this.oldNodes;
        newShapes[shapeIndex] = newShape;
        useStore.getState().setShapes(newShapes);
    }
}

export class ConvertSegmentToCurveCommand implements Command {
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
        this.newNodes = this.calculateNewNodes(shape, nodeIndex);
    }

    private calculateNewNodes(shape: any, index: number): PathNode[] {
        const newNodes = shape.nodes.map((n: any) => n.clone());

        if (!shape.closed && index === newNodes.length - 1) return newNodes;

        const startNode = newNodes[index];
        const nextIndex = (index + 1) % newNodes.length;
        const endNode = newNodes[nextIndex];

        const dx = endNode.x - startNode.x;
        const dy = endNode.y - startNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const handleLen = dist / 3;
        const angle = Math.atan2(dy, dx);

        startNode.cpOut = {
            x: startNode.x + Math.cos(angle) * handleLen,
            y: startNode.y + Math.sin(angle) * handleLen
        };
        endNode.cpIn = {
            x: endNode.x + Math.cos(angle + Math.PI) * handleLen,
            y: endNode.y + Math.sin(angle + Math.PI) * handleLen
        };

        if (startNode.type === 'smooth' || startNode.type === 'symmetric') {
            startNode.type = 'corner';
        }
        if (endNode.type === 'smooth' || endNode.type === 'symmetric') {
            endNode.type = 'corner';
        }

        return newNodes;
    }

    execute() {
        const shapes = useStore.getState().shapes;
        const shapeIndex = shapes.findIndex(s => s.id === this.shapeId);
        if (shapeIndex === -1) return;

        const shape = shapes[shapeIndex];
        if (!shape.nodes || !shape.clone) return;

        const newShapes = [...shapes];
        const newShape = shape.clone();
        newShape.id = this.shapeId;
        newShape.nodes = this.newNodes;
        newShapes[shapeIndex] = newShape;
        useStore.getState().setShapes(newShapes);
    }

    undo() {
        const shapes = useStore.getState().shapes;
        const shapeIndex = shapes.findIndex(s => s.id === this.shapeId);
        if (shapeIndex === -1) return;

        const shape = shapes[shapeIndex];
        if (!shape.nodes || !shape.clone) return;

        const newShapes = [...shapes];
        const newShape = shape.clone();
        newShape.id = this.shapeId;
        newShape.nodes = this.oldNodes;
        newShapes[shapeIndex] = newShape;
        useStore.getState().setShapes(newShapes);
    }
}
