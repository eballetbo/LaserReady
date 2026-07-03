import { vi } from 'vitest';
import { IEditorContext } from '../core/tools/base';
import { useStore } from '../store/useStore';
import { HistoryManager } from '../features/editor/history';

/**
 * Creates a mock CanvasRenderingContext2D covering every Canvas2D method used
 * anywhere in the render pipeline (see renderer.ts, distance-helper.ts,
 * registry.ts, tools/*.ts, models/text.ts). jsdom's own canvas mock does not
 * implement most drawing methods, so any test that exercises real rendering
 * (directly or via CanvasController.renderImmediate) needs this instead of
 * an ad-hoc, partial mock — otherwise missing methods throw
 * "this.ctx.xxx is not a function" during the test run.
 */
export function createMockContext(): CanvasRenderingContext2D {
    return {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        closePath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        bezierCurveTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        arc: vi.fn(),
        roundRect: vi.fn(),
        rect: vi.fn(),
        clip: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        clearRect: vi.fn(),
        fillRect: vi.fn(),
        strokeRect: vi.fn(),
        fillText: vi.fn(),
        strokeText: vi.fn(),
        measureText: vi.fn(() => ({ width: 0 }) as TextMetrics),
        isPointInPath: vi.fn(() => true),
        isPointInStroke: vi.fn(() => false),
        translate: vi.fn(),
        rotate: vi.fn(),
        scale: vi.fn(),
        setTransform: vi.fn(),
        setLineDash: vi.fn(),
        getLineDash: vi.fn(() => []),
        lineWidth: 1,
        lineDashOffset: 0,
        strokeStyle: '',
        fillStyle: '',
        font: '',
        textAlign: 'left',
        textBaseline: 'alphabetic',
    } as unknown as CanvasRenderingContext2D;
}

export function createMockEditor(history?: HistoryManager): IEditorContext {
    const ctx = createMockContext();
    const hist = history || new HistoryManager();

    return {
        canvas: { style: {}, getContext: () => ctx, width: 800, height: 600 } as unknown as HTMLCanvasElement,
        ctx,
        history: hist,
        activeLayerId: 'layer-1',
        config: {
            anchorSize: 8,
            handleRadius: 5,
            colorAnchor: '#aaa',
            colorHandle: '#bbb',
            colorHandleLine: '#ccc',
            colorStroke: '#333',
            colorFill: 'transparent',
            colorSelection: '#4a90d9',
            gridSpacing: 10,
        },
        getMousePos: vi.fn((e: MouseEvent) => ({ x: e.clientX, y: e.clientY })),
        render: vi.fn(),
        renderImmediate: vi.fn(),
        moveSelected: vi.fn(),

        get shapes() { return useStore.getState().shapes; },
        get selectedShapes() {
            const state = useStore.getState();
            return state.shapes.filter(s => state.selectedShapes.includes(s.id));
        },

        tool: 'select',
        activePath: null,
        previewPoint: null,
        previewOrigin: null,
        selectionBox: null,
        selectedShape: undefined,
        zoom: 1,
        pan: { x: 0, y: 0 },
        renderer: { drawScene: vi.fn() },

        snapManager: {
            snapPoint: vi.fn(() => ({ type: 'none', point: { x: 0, y: 0 } })),
            snapAngle: vi.fn((angle: number) => angle),
            activeSnap: null,
            settings: { enabled: true, grid: true, objects: true, threshold: 10 },
            clear: vi.fn(),
        },
    };
}
