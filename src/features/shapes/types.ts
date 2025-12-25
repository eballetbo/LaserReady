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
}
