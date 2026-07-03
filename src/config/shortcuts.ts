/**
 * Centralized keyboard shortcut definitions.
 * Tool shortcuts use single keys (no modifier).
 */

export type ToolType =
    | 'select'
    | 'node-edit'
    | 'pen'
    | 'rect'
    | 'circle'
    | 'text'
    | 'offset'
    | 'fillet'
    | 'star'
    | 'hand'
    | 'triangle'
    | 'pentagon'
    | 'polygon';

export const TOOL_SHORTCUTS: Record<string, ToolType> = {
    'v': 'select',
    'n': 'node-edit',
    'p': 'pen',
    'r': 'rect',
    'e': 'circle',
    't': 'text',
    'o': 'offset',
    'f': 'fillet',
    's': 'star',
};

export const SHORTCUT_DESCRIPTIONS: Record<string, string> = {
    // Tools
    'V': 'Select tool',
    'N': 'Node edit tool',
    'P': 'Pen tool',
    'R': 'Rectangle tool',
    'E': 'Ellipse tool',
    'T': 'Text tool',
    'O': 'Offset tool',
    'F': 'Fillet tool',
    'S': 'Star tool',

    // Edit
    'Ctrl+Z': 'Undo',
    'Ctrl+Shift+Z': 'Redo',
    'Ctrl+Y': 'Redo',
    'Ctrl+C': 'Copy',
    'Ctrl+X': 'Cut',
    'Ctrl+V': 'Paste',
    'Ctrl+D': 'Duplicate',
    'Ctrl+A': 'Select all',
    'Delete': 'Delete selected',

    // Z-order
    'Ctrl+]': 'Bring forward',
    'Ctrl+[': 'Send backward',
    'Ctrl+Shift+]': 'Bring to front',
    'Ctrl+Shift+[': 'Send to back',

    // Transform
    'Arrow keys': 'Nudge 1px',
    'Shift+Arrow': 'Nudge 10px',

    // File
    'Ctrl+N': 'New document',
    'Ctrl+S': 'Save project',

    // View
    'Ctrl+0': 'Fit to screen',
    'Ctrl++': 'Zoom in',
    'Ctrl+-': 'Zoom out',
};
