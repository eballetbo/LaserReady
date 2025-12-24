/**
 * Manages the history stack for undo/redo operations.
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
     * Pushes a new state to the history.
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
     * Returns the previous state and moves current state to redo stack.
     * @param currentState The current state before undoing (to be pushed to redo).
     * @returns The previous state.
     */
    undo(currentState: any): any | null {
        if (this.undoStack.length === 0) return null;

        const previousState = this.undoStack.pop();
        this.redoStack.push(currentState);

        // Update lastStateStr to match the new 'current' state (which is previousState)
        // Actually, when we undo, the 'current' state becomes previousState.
        // But the top of undo stack is now the one before previousState.
        // Let's just reset lastStateStr to null or re-calculate if needed, 
        // but simpler is to let next push handle it.
        // However, if we undo and then do something, we want to compare against what we undid TO.
        if (this.undoStack.length > 0) {
            this.lastStateStr = JSON.stringify(this.undoStack[this.undoStack.length - 1]);
        } else {
            this.lastStateStr = null;
        }

        return previousState;
    }

    /**
     * Returns the next state and moves current state to undo stack.
     * @param currentState The current state before redoing (to be pushed to undo).
     * @returns The next state.
     */
    redo(currentState: any): any | null {
        if (this.redoStack.length === 0) return null;

        const nextState = this.redoStack.pop();
        this.undoStack.push(currentState);

        this.lastStateStr = JSON.stringify(currentState);

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
