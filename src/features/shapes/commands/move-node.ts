import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { PathNode } from '../models/node';

export class MoveNodeCommand implements Command {
    private shapeId: string;
    private nodeIndex: number;
    private oldNode: PathNode;
    private newNode: PathNode;


    constructor(shapeId: string, nodeIndex: number, oldNode: PathNode, newNode: PathNode) {
        this.shapeId = shapeId;
        this.nodeIndex = nodeIndex;
        this.oldNode = oldNode; // clone should be passed
        this.newNode = newNode; // clone should be passed
    }

    execute(): void {
        const { shapes, setShapes } = useStore.getState();
        const shape = shapes.find(s => s.id === this.shapeId);
        if (shape && shape.nodes && shape.nodes[this.nodeIndex]) {

            // Mutate the node
            // We use the data from newNode
            const targetNode = shape.nodes[this.nodeIndex];
            targetNode.x = this.newNode.x;
            targetNode.y = this.newNode.y;
            targetNode.cpIn.x = this.newNode.cpIn.x;
            targetNode.cpIn.y = this.newNode.cpIn.y;
            targetNode.cpOut.x = this.newNode.cpOut.x;
            targetNode.cpOut.y = this.newNode.cpOut.y;

            // Trigger update
            // We need to trigger a re-render of the editor too if possible, 
            // but setShapes should trigger it via subscription.
            // Creating a shallow copy of shapes array to trigger React/Store updates
            setShapes([...shapes]);
        }
    }

    undo(): void {
        const { shapes, setShapes } = useStore.getState();
        // shapeRef might be stale if store was fully immutably updated? 
        // But our shapes are mutable objects inside the store currently.
        // Safer to find again.
        const shape = shapes.find(s => s.id === this.shapeId);
        if (shape && shape.nodes && shape.nodes[this.nodeIndex]) {
            const targetNode = shape.nodes[this.nodeIndex];
            targetNode.x = this.oldNode.x;
            targetNode.y = this.oldNode.y;
            targetNode.cpIn.x = this.oldNode.cpIn.x;
            targetNode.cpIn.y = this.oldNode.cpIn.y;
            targetNode.cpOut.x = this.oldNode.cpOut.x;
            targetNode.cpOut.y = this.oldNode.cpOut.y;

            setShapes([...shapes]);
        }
    }
}
