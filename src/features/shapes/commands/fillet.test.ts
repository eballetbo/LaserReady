import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FilletCornerCommand, RemoveRadiusCommand } from './fillet';
import { useStore } from '../../../store/useStore';
import { PathNode } from '../../../core/types/core';

// Mock IShape
interface MockShape {
    id: string;
    type: string;
    nodes: PathNode[];
    closed: boolean;
}

describe('Fillet Commands', () => {
    let shape: MockShape;

    beforeEach(() => {
        // Setup simple 90-degree corner
        // P0 (0, 100) -> P1 (0, 0) -> P2 (100, 0)
        shape = {
            id: 's1',
            type: 'path',
            closed: false,
            nodes: [
                { x: 0, y: 100, type: 'corner', cpIn: { x: 0, y: 100 }, cpOut: { x: 0, y: 100 } },
                { x: 0, y: 0, type: 'corner', cpIn: { x: 0, y: 0 }, cpOut: { x: 0, y: 0 } },
                { x: 100, y: 0, type: 'corner', cpIn: { x: 100, y: 0 }, cpOut: { x: 100, y: 0 } }
            ]
        };

        const updateShape = vi.fn((s) => {
            // Mock update
            Object.assign(shape, s);
        });

        useStore.setState({
            shapes: [shape],
            updateShape
        } as any);
    });

    it('FilletCornerCommand should replace corner with arc', () => {
        // Fillet P1 (index 1) with radius 10
        const cmd = new FilletCornerCommand('s1', 1, 10);
        cmd.execute();

        const s = useStore.getState().shapes[0];
        expect(s.nodes.length).toBe(4); // Was 3, replace 1 with 2 -> 4 nodes.

        // P0 is same
        expect(s.nodes[0].x).toBe(0);
        expect(s.nodes[0].y).toBe(100);

        // T1 should be at (0, 10)
        expect(s.nodes[1].x).toBeCloseTo(0);
        expect(s.nodes[1].y).toBeCloseTo(10);

        // T2 should be at (10, 0)
        expect(s.nodes[2].x).toBeCloseTo(10);
        expect(s.nodes[2].y).toBeCloseTo(0);

        // P3 is same
        expect(s.nodes[3].x).toBe(100);
        expect(s.nodes[3].y).toBe(0);
    });

    it('RemoveRadiusCommand should restore corner', () => {
        // Apply fillet first
        const fillet = new FilletCornerCommand('s1', 1, 10);
        fillet.execute();

        const sAfterFillet = useStore.getState().shapes[0];
        expect(sAfterFillet.nodes.length).toBe(4);

        // Remove radius starting at T1 (index 1)
        const remove = new RemoveRadiusCommand('s1', 1);
        remove.execute();

        const sRestored = useStore.getState().shapes[0];
        expect(sRestored.nodes.length).toBe(3);

        // Middle node should be (0,0)
        expect(sRestored.nodes[1].x).toBeCloseTo(0);
        expect(sRestored.nodes[1].y).toBeCloseTo(0);
    });
});
