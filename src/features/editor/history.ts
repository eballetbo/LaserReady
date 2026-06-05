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

    constructor(limit: number = 50) {
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

    clear(): void {
        this.undoStack = [];
        this.redoStack = [];
    }
}
