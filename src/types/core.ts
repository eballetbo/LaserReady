export type ITool = 'select' | 'pen' | 'rect' | 'circle' | 'polygon' | 'star';

export type OperationMode = 'CUT' | 'SCORE' | 'ENGRAVE';

export interface ILayer {
    id: string;
    name: string;
    color: string;
    mode: OperationMode;
}

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
}
