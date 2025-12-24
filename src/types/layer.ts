export type OperationMode = 'CUT' | 'SCORE' | 'ENGRAVE';

export interface LaserLayer {
    id: string;
    color: string;
    mode: OperationMode;
    name: string;
}
