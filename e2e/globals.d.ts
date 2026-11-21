export interface E2ENode {
    x: number;
    y: number;
    cpIn: { x: number; y: number };
    cpOut: { x: number; y: number };
    type: string;
}

export interface E2EShape {
    id: string;
    type: string;
    layerId: string;
    closed: boolean;
    nodes?: E2ENode[];
    children?: E2EShape[];
    text?: string;
    x?: number;
    y?: number;
    fontSize?: number;
    fontFamily?: string;
    strokeColor?: string;
    strokeWidth?: number;
    fillColor?: string;
    params?: { sides?: number; points?: number; innerRadius?: number };
    getBounds?: () => { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number; cx: number; cy: number };
    clone?: () => E2EShape;
}

export interface E2EStoreState {
    shapes: E2EShape[];
    selectedShapes: string[];
    tool: string;
    zoom: number;
    pan: { x: number; y: number };
    material: { width: number; height: number };
    layers: Array<{ id: string; name: string; color: string; mode: string; visible?: boolean }>;
    activeLayerId: string;
    setShapes: (shapes: E2EShape[]) => void;
    setSelectedShapes: (ids: string[]) => void;
    setFilletRadius: (r: number) => void;
    setOffsetDistance: (d: number) => void;
}

export interface E2EStoreApi {
    getState: () => E2EStoreState;
    setState: (partial: Partial<E2EStoreState>) => void;
}

declare global {
    interface Window {
        useStore?: E2EStoreApi;
        store?: E2EStoreApi;
        __io_exports?: {
            exportToSVG: (shapes: E2EShape[], width: number, height: number, layers: E2EStoreState['layers']) => string;
        };
        __test_internals?: {
            PathShape: new (nodes: E2ENode[], closed: boolean, layerId?: string) => E2EShape;
        };
        PathShape?: new (nodes: E2ENode[], closed: boolean, layerId?: string) => E2EShape;
        __HACKED?: unknown;
    }
}
