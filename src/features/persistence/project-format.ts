import { IShape } from '../shapes/types';
import { LaserLayer } from '../../types/layer';
import { PathShape } from '../shapes/models/path';
import { TextObject } from '../shapes/models/text';
import { GroupShape } from '../shapes/models/group';

export const PROJECT_VERSION = 1;

export interface LaserProject {
    version: number;
    shapes: Record<string, any>[];
    layers: LaserLayer[];
    activeLayerId: string;
    material: { width: number; height: number };
    metadata?: {
        name?: string;
        createdAt?: string;
        modifiedAt?: string;
    };
}

export function serializeProject(
    shapes: IShape[],
    layers: LaserLayer[],
    activeLayerId: string,
    material: { width: number; height: number }
): LaserProject {
    return {
        version: PROJECT_VERSION,
        shapes: shapes.map(s => {
            if (typeof s.toJSON === 'function') return s.toJSON();
            return s;
        }),
        layers,
        activeLayerId,
        material,
        metadata: {
            modifiedAt: new Date().toISOString()
        }
    };
}

export function deserializeShapes(data: Record<string, any>[]): IShape[] {
    return data.map(json => {
        switch (json.type) {
            case 'text':
                return TextObject.fromJSON(json);
            case 'group':
                return GroupShape.fromJSON(json);
            default:
                return PathShape.fromJSON(json);
        }
    });
}
