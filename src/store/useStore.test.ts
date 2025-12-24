import { describe, it, expect } from 'vitest';
import { useStore } from './useStore';
import { PathShape } from '../features/shapes/models/path';

describe('useStore', () => {
    it('should initialize with default values', () => {
        const state = useStore.getState();
        expect(state.tool).toBe('select');
        expect(state.zoom).toBe(1);
        expect(state.shapes).toEqual([]);
        expect(state.layers).toHaveLength(1);
        expect(state.activeLayerId).toBe('layer-1');
    });

    it('should update zoom', () => {
        useStore.getState().setZoom(2);
        expect(useStore.getState().zoom).toBe(2);
    });

    it('should add a shape', () => {
        const shape = new PathShape([], true, 'layer-1', 'rect', {});
        useStore.getState().setShapes([shape]);

        const state = useStore.getState();
        expect(state.shapes).toHaveLength(1);
        expect(state.shapes[0].type).toBe('rect');
    });

    it('should update tool', () => {
        useStore.getState().setTool('pen');
        expect(useStore.getState().tool).toBe('pen');
    });
});
