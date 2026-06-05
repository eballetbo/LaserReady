import { describe, it, expect } from 'vitest';
import { validateProject, deserializeShapes, serializeProject } from './project-format';
import { PathShape } from '../shapes/models/path';
import { PathNode } from '../shapes/models/node';
import { TextObject } from '../shapes/models/text';

describe('validateProject', () => {
    const validProject = {
        version: 1,
        shapes: [{ id: 'shape-1', type: 'path', nodes: [], closed: false, layerId: 'layer-1' }],
        layers: [{ id: 'layer-1', name: 'Cut', mode: 'cut', color: '#ff0000' }],
        activeLayerId: 'layer-1',
        material: { width: 400, height: 300 },
    };

    it('should accept a valid project', () => {
        const result = validateProject(validProject);
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it('should reject non-object input', () => {
        expect(validateProject(null).valid).toBe(false);
        expect(validateProject('string').valid).toBe(false);
        expect(validateProject(42).valid).toBe(false);
    });

    it('should reject missing version', () => {
        const { version, ...noVersion } = validProject;
        const result = validateProject(noVersion);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('version'))).toBe(true);
    });

    it('should reject unsupported future version', () => {
        const result = validateProject({ ...validProject, version: 99 });
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('Unsupported version'))).toBe(true);
    });

    it('should reject missing shapes array', () => {
        const result = validateProject({ ...validProject, shapes: 'not-an-array' });
        expect(result.valid).toBe(false);
    });

    it('should reject too many shapes', () => {
        const bigShapes = Array.from({ length: 10001 }, (_, i) => ({ id: `s-${i}`, type: 'path' }));
        const result = validateProject({ ...validProject, shapes: bigShapes });
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('Too many'))).toBe(true);
    });

    it('should reject shapes with missing id', () => {
        const result = validateProject({ ...validProject, shapes: [{ type: 'path' }] });
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('missing id'))).toBe(true);
    });

    it('should reject invalid layers', () => {
        const result = validateProject({ ...validProject, layers: [{ notId: true }] });
        expect(result.valid).toBe(false);
    });

    it('should reject invalid material', () => {
        const result = validateProject({ ...validProject, material: { width: 'big' } });
        expect(result.valid).toBe(false);
    });

    it('should reject oversized files', () => {
        const result = validateProject(validProject, 60 * 1024 * 1024);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('too large'))).toBe(true);
    });
});

describe('deserializeShapes', () => {
    it('should deserialize path shapes', () => {
        const data = [{
            id: 'p1',
            type: 'path',
            nodes: [
                { x: 0, y: 0, cpIn: { x: 0, y: 0 }, cpOut: { x: 0, y: 0 }, type: 'corner' },
                { x: 100, y: 100, cpIn: { x: 100, y: 100 }, cpOut: { x: 100, y: 100 }, type: 'corner' },
            ],
            closed: false,
            layerId: 'layer-1',
        }];
        const shapes = deserializeShapes(data);
        expect(shapes).toHaveLength(1);
        expect(shapes[0]).toBeInstanceOf(PathShape);
        expect(shapes[0].id).toBe('p1');
    });

    it('should deserialize text shapes', () => {
        const data = [{
            id: 't1',
            type: 'text',
            x: 50,
            y: 50,
            text: 'Hello',
            layerId: 'layer-1',
            fontSize: 24,
            fontFamily: 'Arial',
            fontWeight: 'normal',
            fontStyle: 'normal',
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
        }];
        const shapes = deserializeShapes(data);
        expect(shapes).toHaveLength(1);
        expect(shapes[0]).toBeInstanceOf(TextObject);
        expect((shapes[0] as any).text).toBe('Hello');
    });

    it('should skip malformed shapes gracefully', () => {
        const data = [
            { id: 'good', type: 'path', nodes: [{ x: 0, y: 0, cpIn: { x: 0, y: 0 }, cpOut: { x: 0, y: 0 } }], closed: false, layerId: 'l1' },
            null as any,
        ];
        const shapes = deserializeShapes(data);
        expect(shapes.length).toBeLessThanOrEqual(2);
    });
});

describe('serializeProject', () => {
    it('should produce a valid project structure', () => {
        const node = new PathNode(10, 20);
        const shape = new PathShape([node], false, 'layer-1');
        const layers = [{ id: 'layer-1', name: 'Cut', mode: 'cut' as const, color: '#ff0000' }];
        const material = { width: 400, height: 300 };

        const project = serializeProject([shape], layers, 'layer-1', material);

        expect(project.version).toBe(1);
        expect(project.shapes).toHaveLength(1);
        expect(project.layers).toEqual(layers);
        expect(project.material).toEqual(material);
        expect(project.metadata?.modifiedAt).toBeDefined();
    });
});
