import { Command } from '../../core/commands/command';

/**
 * Manages the history stack for undo/redo operations.
 * STEP 2: Now supports both Commands (new) and state snapshots (legacy).
 */
export class HistoryManager {
    private limit: number;
    private undoStack: any[];
    private redoStack: any[];
    private lastStateStr: string | null;

    constructor(limit: number = 50) {
        this.limit = limit;
        this.undoStack = [];
        this.redoStack = [];
        this.lastStateStr = null;
    }

    /**
     * STEP 2: Execute a command and add it to the undo stack.
     * This is the new Command Pattern interface.
     * @param command The command to execute
     */
    execute(command: Command): void {
        command.execute();

        // Add command to undo stack
        this.undoStack.push(command);

        if (this.undoStack.length > this.limit) {
            this.undoStack.shift();
        }

        // Clear redo stack on new action
        this.redoStack = [];

        // Reset lastStateStr since we're using commands now
        this.lastStateStr = null;
    }

    /**
     * Pushes a new state to the history.
     * LEGACY: For backward compatibility with state-based undo.
     * @param state The state to save.
     */
    push(state: any): void {
        const stateStr = JSON.stringify(state);

        // Avoid duplicates
        if (stateStr === this.lastStateStr) {
            return;
        }

        this.undoStack.push(state);
        this.lastStateStr = stateStr;

        if (this.undoStack.length > this.limit) {
            this.undoStack.shift();
        }
        // Clear redo stack on new action
        this.redoStack = [];
    }

    /**
     * STEP 3: Command-aware undo.
     * Detects if stack contains Commands or state snapshots.
     * @param currentState The current state (only used for legacy state-based undo)
     * @returns The previous state (only for legacy), or null
     */
    undo(currentState?: any): any | null {
        if (this.undoStack.length === 0) return null;

        const item = this.undoStack.pop();

        // STEP 3: Detect if item is a Command
        if (item && typeof item === 'object' && 'execute' in item && 'undo' in item) {
            // It's a Command!
            item.undo();  // Command handles restoration itself
            this.redoStack.push(item);
            return null;  // Commands don't return state
        }

        // Legacy state-based undo
        const previousState = item;
        if (currentState !== undefined) {
            this.redoStack.push(currentState);
        }

        // Update lastStateStr for legacy path
        if (this.undoStack.length > 0) {
            this.lastStateStr = JSON.stringify(this.undoStack[this.undoStack.length - 1]);
        } else {
            this.lastStateStr = null;
        }

        return previousState;
    }

    /**
     * STEP 3: Command-aware redo.
     * Detects if stack contains Commands or state snapshots.
     * @param currentState The current state (only used for legacy state-based redo)
     * @returns The next state (only for legacy), or null
     */
    redo(currentState?: any): any | null {
        if (this.redoStack.length === 0) return null;

        const item = this.redoStack.pop();

        // STEP 3: Detect if item is a Command
        if (item && typeof item === 'object' && 'execute' in item && 'undo' in item) {
            // It's a Command!
            item.execute();  // Re-execute the command
            this.undoStack.push(item);
            return null;  // Commands don't return state
        }

        // Legacy state-based redo
        const nextState = item;
        if (currentState !== undefined) {
            this.undoStack.push(currentState);
            this.lastStateStr = JSON.stringify(currentState);
        }

        return nextState;
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
        this.lastStateStr = null;
    }
}
