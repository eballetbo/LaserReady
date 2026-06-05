import { IShape } from '../shapes/types';
import { LaserLayer } from '../../types/layer';
import { PathShape } from '../shapes/models/path';
import { TextObject } from '../shapes/models/text';
import { GroupShape } from '../shapes/models/group';

export const PROJECT_VERSION = 1;
const MAX_SHAPES = 10000;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

export interface LaserProject {
    version: number;
    shapes: Record<string, unknown>[];
    layers: LaserLayer[];
    activeLayerId: string;
    material: { width: number; height: number };
    metadata?: {
        name?: string;
        createdAt?: string;
        modifiedAt?: string;
    };
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

export function validateProject(data: unknown, rawSize?: number): ValidationResult {
    const errors: string[] = [];

    if (rawSize !== undefined && rawSize > MAX_FILE_SIZE) {
        errors.push(`File too large (${(rawSize / 1024 / 1024).toFixed(1)} MB, max ${MAX_FILE_SIZE / 1024 / 1024} MB)`);
        return { valid: false, errors };
    }

    if (!data || typeof data !== 'object') {
        errors.push('Project data is not a valid object');
        return { valid: false, errors };
    }

    const project = data as Record<string, unknown>;

    if (typeof project.version !== 'number') {
        errors.push('Missing or invalid version field');
    } else if (project.version > PROJECT_VERSION) {
        errors.push(`Unsupported version ${project.version} (max supported: ${PROJECT_VERSION})`);
    }

    if (!Array.isArray(project.shapes)) {
        errors.push('Missing or invalid shapes array');
    } else {
        if (project.shapes.length > MAX_SHAPES) {
            errors.push(`Too many shapes (${project.shapes.length}, max ${MAX_SHAPES})`);
        }
        for (let i = 0; i < Math.min(project.shapes.length, 5); i++) {
            const shape = project.shapes[i];
            if (!shape || typeof shape !== 'object') {
                errors.push(`Shape at index ${i} is not a valid object`);
                break;
            }
            const s = shape as Record<string, unknown>;
            if (typeof s.id !== 'string') {
                errors.push(`Shape at index ${i} missing id`);
            }
            if (s.type !== null && typeof s.type !== 'string') {
                errors.push(`Shape at index ${i} has invalid type`);
            }
        }
    }

    if (!Array.isArray(project.layers)) {
        errors.push('Missing or invalid layers array');
    } else {
        for (const layer of project.layers) {
            if (!layer || typeof layer !== 'object') {
                errors.push('Layer entry is not a valid object');
                break;
            }
            const l = layer as Record<string, unknown>;
            if (typeof l.id !== 'string' || typeof l.name !== 'string') {
                errors.push('Layer missing required id or name fields');
                break;
            }
        }
    }

    if (!project.material || typeof project.material !== 'object') {
        errors.push('Missing or invalid material field');
    } else {
        const m = project.material as Record<string, unknown>;
        if (typeof m.width !== 'number' || typeof m.height !== 'number') {
            errors.push('Material must have numeric width and height');
        }
    }

    return { valid: errors.length === 0, errors };
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

export function deserializeShapes(data: Record<string, unknown>[]): IShape[] {
    const shapes: IShape[] = [];
    for (const json of data) {
        try {
            switch (json.type) {
                case 'text':
                    shapes.push(TextObject.fromJSON(json));
                    break;
                case 'group':
                    shapes.push(GroupShape.fromJSON(json));
                    break;
                default:
                    shapes.push(PathShape.fromJSON(json));
                    break;
            }
        } catch (err) {
            console.warn('Skipping undeserializable shape:', json.id, err);
        }
    }
    return shapes;
}
