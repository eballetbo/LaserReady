import { Command } from '../../core/commands/command';
import { triggerAutoSave } from '../persistence/auto-save';

/**
 * Manages the history stack for undo/redo operations.
 * STEP 2: Now supports both Commands (new) and state snapshots (legacy).
 */
export class HistoryManager {
    private limit: number;
    private undoStack: Command[];
    private redoStack: Command[];

    constructor(limit: number = 100) {
        this.limit = limit;
        this.undoStack = [];
        this.redoStack = [];
    }

    /**
     * Execute a command and add it to the undo stack.
     * @param command The command to execute
     */
    execute(command: Command): void {
        command.execute();

        this.undoStack.push(command);

        if (this.undoStack.length > this.limit) {
            this.undoStack.shift();
        }

        this.redoStack = [];
        triggerAutoSave();
    }

    /**
     * Undo the last command.
     */
    undo(): void {
        if (this.undoStack.length === 0) return;

        const command = this.undoStack.pop();
        if (command) {
            command.undo();
            this.redoStack.push(command);
            triggerAutoSave();
        }
    }

    redo(): void {
        if (this.redoStack.length === 0) return;

        const command = this.redoStack.pop();
        if (command) {
            command.execute();
            this.undoStack.push(command);
            triggerAutoSave();
        }
    }

    canUndo(): boolean {
        return this.undoStack.length > 0;
    }

    canRedo(): boolean {
        return this.redoStack.length > 0;
    }

    get undoLabel(): string | undefined {
        const top = this.undoStack[this.undoStack.length - 1];
        return top?.label;
    }

    get redoLabel(): string | undefined {
        const top = this.redoStack[this.redoStack.length - 1];
        return top?.label;
    }

    get undoCount(): number {
        return this.undoStack.length;
    }

    get redoCount(): number {
        return this.redoStack.length;
    }

    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
    }
}
