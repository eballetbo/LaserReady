import { PathNode } from './models/node';
import { Rect, Point } from '../../core/math/geometry';

export type ShapeType = 'path' | 'rect' | 'circle' | 'star' | 'polygon' | 'text' | 'group' | string;

export interface ShapeParams {
    sides?: number;
    points?: number;
    innerRadius?: number;
    [key: string]: number | string | boolean | undefined;
}

export interface IShape {
    id: string;
    type: ShapeType | null;
    layerId: string;
    closed: boolean;
    selected?: boolean;
    x?: number;
    y?: number;
    rotation?: number;
    params?: ShapeParams;
    nodes?: PathNode[];
    children?: IShape[];
    strokeColor?: string;
    strokeWidth?: number;
    fillColor?: string;

    move?(dx: number, dy: number): void;
    getBounds?(): Rect;
    toJSON?(): Record<string, unknown>;

    clone?(): IShape;
    rotate?(angle: number, center: Point): void;
    scale?(sx: number, sy: number, center: Point): void;
}

export type AlignType = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom';
export type AlignReference = 'selection' | 'page';
