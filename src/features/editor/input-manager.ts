export class InputManager {
    canvas: HTMLCanvasElement;
    zoom: number = 1;
    pan: { x: number, y: number } = { x: 0, y: 0 };

    private listeners: {
        down?: (x: number, y: number, event: MouseEvent) => void;
        move?: (x: number, y: number, event: MouseEvent) => void;
        up?: (x: number, y: number, event: MouseEvent) => void;
        keydown?: (event: KeyboardEvent) => void;
    } = {};

    private boundHandlers: {
        mouseDown: (e: MouseEvent) => void;
        mouseMove: (e: MouseEvent) => void;
        mouseUp: (e: MouseEvent) => void;
        keyDown: (e: KeyboardEvent) => void;
    };

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        this.boundHandlers = {
            mouseDown: this.handleMouseDown.bind(this),
            mouseMove: this.handleMouseMove.bind(this),
            mouseUp: this.handleMouseUp.bind(this),
            keyDown: this.handleKeyDown.bind(this)
        };

        this.init();
    }

    private init() {
        this.canvas.addEventListener('mousedown', this.boundHandlers.mouseDown);
        this.canvas.addEventListener('mousemove', this.boundHandlers.mouseMove);
        window.addEventListener('mouseup', this.boundHandlers.mouseUp);
        window.addEventListener('keydown', this.boundHandlers.keyDown);
    }

    dispose() {
        this.canvas.removeEventListener('mousedown', this.boundHandlers.mouseDown);
        this.canvas.removeEventListener('mousemove', this.boundHandlers.mouseMove);
        window.removeEventListener('mouseup', this.boundHandlers.mouseUp);
        window.removeEventListener('keydown', this.boundHandlers.keyDown);
    }

    setTransform(zoom: number, pan: { x: number, y: number }) {
        this.zoom = zoom;
        this.pan = pan;
    }

    on(event: 'down' | 'move' | 'up', callback: (x: number, y: number, event: MouseEvent) => void): void;
    on(event: 'keydown', callback: (event: KeyboardEvent) => void): void;
    on(event: string, callback: any) {
        if (event === 'down') this.listeners.down = callback;
        if (event === 'move') this.listeners.move = callback;
        if (event === 'up') this.listeners.up = callback;
        if (event === 'keydown') this.listeners.keydown = callback;
    }

    private getWorldPos(e: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left - this.pan.x) / this.zoom,
            y: (e.clientY - rect.top - this.pan.y) / this.zoom
        };
    }

    private handleMouseDown(e: MouseEvent) {
        if (this.listeners.down) {
            const pos = this.getWorldPos(e);
            this.listeners.down(pos.x, pos.y, e);
        }
    }

    private handleMouseMove(e: MouseEvent) {
        if (this.listeners.move) {
            const pos = this.getWorldPos(e);
            this.listeners.move(pos.x, pos.y, e);
        }
    }

    private handleMouseUp(e: MouseEvent) {
        if (this.listeners.up) {
            const pos = this.getWorldPos(e);
            this.listeners.up(pos.x, pos.y, e);
        }
    }

    private handleKeyDown(e: KeyboardEvent) {
        if (this.listeners.keydown) {
            this.listeners.keydown(e);
        }
    }
}
