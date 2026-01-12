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
        this.newNodes = this.calculateNewNodes(shape.nodes, nodeIndex);
    }

    private calculateNewNodes(nodes: PathNode[], index: number): PathNode[] {
        const newNodes = nodes.map(n => n.clone());
        const startNode = newNodes[index];
        const nextIndex = (index + 1) % newNodes.length;
        const endNode = newNodes[nextIndex];

        // To make a segment a line, we retract the handles to the anchors
        startNode.cpOut = { x: startNode.x, y: startNode.y };
        endNode.cpIn = { x: endNode.x, y: endNode.y };

        // If the start node was smooth/symmetric, it should probably become a corner
        // to avoid affecting the previous segment, creating a "sharp" transition into the line.
        if (startNode.type === 'smooth' || startNode.type === 'symmetric') {
            startNode.type = 'corner';
        }

        // Same for end node, if we want the line to be a straight shot without affecting next segment
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
        this.newNodes = this.calculateNewNodes(shape.nodes, nodeIndex);
    }

    private calculateNewNodes(nodes: PathNode[], index: number): PathNode[] {
        const newNodes = nodes.map(n => n.clone());
        const startNode = newNodes[index];
        const nextIndex = (index + 1) % newNodes.length;
        const endNode = newNodes[nextIndex];

        // Vector from start to end
        const dx = endNode.x - startNode.x;
        const dy = endNode.y - startNode.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Heuristic: Extend handles by 1/3 of segment length
        const handleLen = dist / 3;

        // Angle of the segment
        const angle = Math.atan2(dy, dx);

        // Extend cpOut of start node towards end node
        startNode.cpOut = {
            x: startNode.x + Math.cos(angle) * handleLen,
            y: startNode.y + Math.sin(angle) * handleLen
        };

        // Extend cpIn of end node back towards start node
        endNode.cpIn = {
            x: endNode.x + Math.cos(angle + Math.PI) * handleLen,
            y: endNode.y + Math.sin(angle + Math.PI) * handleLen
        };

        // We generally want these to be smooth if they weren't already, but
        // for "Convert to Curve" usually we just want to inflate the segment.
        // If the user wants them smooth, they can use 'S'.
        // However, if we don't change type to at least 'corner', it might be ambiguous.
        // Let's leave type as is (likely 'corner') or force it?
        // LightBurn keeps it as independent handles (Corner).
        // If they were already smooth, this modification breaks smoothness unless we re-adjust opposite handles.
        // For simplicity and standard behavior: Break smoothness to ensure we effectively curve THIS segment.
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
