import { PathNode } from './models/node';
import { Rect, Point } from '../../core/math/geometry';
import type { PathShape } from './models/path';
import type { TextObject } from './models/text';
import type { GroupShape } from './models/group';

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
    dashArray?: number[];
    opacity?: number;
    visible?: boolean;

    move?(dx: number, dy: number): void;
    getBounds?(): Rect;
    toJSON?(): Record<string, unknown>;

    clone?(): IShape;
    rotate?(angle: number, center: Point): void;
    scale?(sx: number, sy: number, center: Point): void;
}

export interface ITextShape extends IShape {
    type: 'text';
    text: string;
    fontFamily: string;
    fontSize: number;
    fontWeight?: string;
    fontStyle?: string;
    scaleX?: number;
    scaleY?: number;
}

export interface IGroupShape extends IShape {
    type: 'group';
    children: IShape[];
}

/** Discriminated union of concrete shape model classes. */
export type Shape = PathShape | TextObject | GroupShape;

export function isTextShape(shape: IShape): shape is ITextShape {
    return shape.type === 'text';
}

export function isGroupShape(shape: IShape): shape is IGroupShape {
    return shape.type === 'group';
}

export type AlignType = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom';
export type AlignReference = 'selection' | 'page';
