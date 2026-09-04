import { useStore } from '../../store/useStore';

export class InputManager {
    canvas: HTMLCanvasElement;
    zoom: number = 1;
    pan: { x: number, y: number } = { x: 0, y: 0 };

    private listeners: {
        down?: (x: number, y: number, event: MouseEvent) => void;
        move?: (x: number, y: number, event: MouseEvent) => void;
        up?: (x: number, y: number, event: MouseEvent) => void;
        contextmenu?: (x: number, y: number, event: MouseEvent) => void;
        keydown?: (event: KeyboardEvent) => void;
    } = {};

    private boundHandlers: {
        mouseDown: (e: MouseEvent) => void;
        mouseMove: (e: MouseEvent) => void;
        mouseUp: (e: MouseEvent) => void;
        contextMenu: (e: MouseEvent) => void;
        wheel: (e: WheelEvent) => void;
        keyDown: (e: KeyboardEvent) => void;
        keyUp: (e: KeyboardEvent) => void;
    };

    private isPanning = false;
    private isSpacePressed = false;
    private lastMousePos = { x: 0, y: 0 };

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        this.boundHandlers = {
            mouseDown: this.handleMouseDown.bind(this),
            mouseMove: this.handleMouseMove.bind(this),
            mouseUp: this.handleMouseUp.bind(this),
            contextMenu: this.handleContextMenu.bind(this),
            wheel: this.handleWheel.bind(this),
            keyDown: this.handleKeyDown.bind(this),
            keyUp: this.handleKeyUp.bind(this)
        };

        this.init();
    }

    private init() {
        this.canvas.addEventListener('mousedown', this.boundHandlers.mouseDown);
        this.canvas.addEventListener('mousemove', this.boundHandlers.mouseMove);
        window.addEventListener('mouseup', this.boundHandlers.mouseUp);
        this.canvas.addEventListener('contextmenu', this.boundHandlers.contextMenu);
        this.canvas.addEventListener('wheel', this.boundHandlers.wheel, { passive: false });
        window.addEventListener('keydown', this.boundHandlers.keyDown);
        window.addEventListener('keyup', this.boundHandlers.keyUp);
    }

    dispose() {
        this.canvas.removeEventListener('mousedown', this.boundHandlers.mouseDown);
        this.canvas.removeEventListener('mousemove', this.boundHandlers.mouseMove);
        window.removeEventListener('mouseup', this.boundHandlers.mouseUp);
        this.canvas.removeEventListener('contextmenu', this.boundHandlers.contextMenu);
        this.canvas.removeEventListener('wheel', this.boundHandlers.wheel);
        window.removeEventListener('keydown', this.boundHandlers.keyDown);
        window.removeEventListener('keyup', this.boundHandlers.keyUp);
    }

    setTransform(zoom: number, pan: { x: number, y: number }) {
        this.zoom = zoom;
        this.pan = pan;
    }

    on(event: 'down' | 'move' | 'up' | 'contextmenu', callback: (x: number, y: number, event: MouseEvent) => void): void;
    on(event: 'keydown', callback: (event: KeyboardEvent) => void): void;
    on(event: string, callback: ((x: number, y: number, event: MouseEvent) => void) | ((event: KeyboardEvent) => void)) {
        if (event === 'down') this.listeners.down = callback;
        if (event === 'move') this.listeners.move = callback;
        if (event === 'up') this.listeners.up = callback;
        if (event === 'contextmenu') this.listeners.contextmenu = callback;
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
        // Middle Mouse (1) or Spacebar held or Hand Tool
        const isHandTool = useStore.getState().tool === 'hand';
        if (e.button === 1 || this.isSpacePressed || isHandTool) {
            this.isPanning = true;
            this.lastMousePos = { x: e.clientX, y: e.clientY };
            e.preventDefault();
            return;
        }

        if (this.listeners.down) {
            const pos = this.getWorldPos(e);
            this.listeners.down(pos.x, pos.y, e);
        }
    }

    private handleMouseMove(e: MouseEvent) {
        if (this.isPanning) {
            const dx = e.clientX - this.lastMousePos.x;
            const dy = e.clientY - this.lastMousePos.y;
            this.lastMousePos = { x: e.clientX, y: e.clientY };

            const { pan, setPan } = useStore.getState();
            setPan({ x: pan.x + dx, y: pan.y + dy });
            return;
        }

        if (this.listeners.move) {
            const pos = this.getWorldPos(e);
            this.listeners.move(pos.x, pos.y, e);
        }
    }

    private handleMouseUp(e: MouseEvent) {
        if (this.isPanning) {
            this.isPanning = false;
            return;
        }

        if (this.listeners.up) {
            const pos = this.getWorldPos(e);
            this.listeners.up(pos.x, pos.y, e);
        }
    }

    private handleContextMenu(e: MouseEvent) {
        if (this.listeners.contextmenu) {
            const pos = this.getWorldPos(e);
            this.listeners.contextmenu(pos.x, pos.y, e);
        }
    }

    private handleKeyDown(e: KeyboardEvent) {
        if (e.code === 'Space') {
            this.isSpacePressed = true;
            this.canvas.style.cursor = 'grab';
        }
        if (this.listeners.keydown) {
            this.listeners.keydown(e);
        }
    }

    private handleKeyUp(e: KeyboardEvent) {
        if (e.code === 'Space') {
            this.isSpacePressed = false;
            if (!this.isPanning) this.canvas.style.cursor = 'default';
        }
    }

    private handleWheel(e: WheelEvent) {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 1.1 : 0.9;
        const rect = this.canvas.getBoundingClientRect();
        useStore.getState().zoomAtPoint(delta, e.clientX - rect.left, e.clientY - rect.top);
    }
}
