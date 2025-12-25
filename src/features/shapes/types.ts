export interface IShape {
    id: string;
    type: string | null;
    layerId: string;
    closed: boolean;
    selected?: boolean;
    x?: number;
    y?: number;
    rotation?: number;
    params?: Record<string, any>;
    nodes?: any[];
    // Style overrides
    strokeColor?: string;
    strokeWidth?: number;
    fillColor?: string;

    // Behavior (optional as not all 'shapes' might be instantiated classes yet)
    move?(dx: number, dy: number): void;
    getBounds?(): any; // Rect?
    toJSON?(): any;
    clone?(): IShape;
}
