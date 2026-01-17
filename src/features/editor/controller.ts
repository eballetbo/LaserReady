import { DEFAULT_GRID_SPACING } from '../../config/constants';
import { CanvasRenderer } from './render/renderer';
import { RendererConfig } from './render/types';
import { InputManager } from './input';
import { ToolManager } from './tool-manager';
import { PathShape } from '../shapes/models/path';
import { IShape } from '../shapes/types';
import { SVGImportService } from '../../utils/svg-import';
import { HistoryManager } from './history';
import { SnapManager } from './snapping';
import { useStore } from '../../store/useStore';
import { DeleteShapeCommand } from '../shapes/commands/delete';
import { MoveShapeCommand } from '../shapes/commands/move';
import { UpdateStyleCommand } from '../shapes/commands/style';
import { BooleanCommand } from '../shapes/commands/boolean';
import { GroupCommand } from '../shapes/commands/group';
import { UngroupCommand } from '../shapes/commands/ungroup';
import { updateShapeGeometry } from '../../utils/geometry-updater';

/**
 * Main Editor Controller.
 */
export class CanvasController {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    renderer: CanvasRenderer;
    inputManager: InputManager;
    history: HistoryManager;
    snapManager: SnapManager;
    toolManager: ToolManager;
    config: RendererConfig;
    onSelectionChange: (selection: IShape[]) => void;
    activePath: PathShape | null;
    previewPoint: { x: number; y: number } | null;
    selectionBox: any | null;
    previewOrigin: { x: number; y: number } | null;
    zoom: number;
    pan: { x: number; y: number };
    unsubscribe: () => void;
    selectedShape?: IShape; // Temporary selection for creation tools

    constructor(canvasElement: HTMLCanvasElement, options: Partial<RendererConfig> & { onSelectionChange?: (s: IShape[]) => void } = {}) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d')!;
        this.renderer = new CanvasRenderer(this.canvas);
        this.inputManager = new InputManager(this.canvas);
        this.toolManager = new ToolManager(this, this.inputManager);
        this.history = new HistoryManager();
        this.snapManager = new SnapManager(this);

        this.config = {
            anchorSize: 8,
            handleRadius: 5,
            colorAnchor: '#007bff',
            colorHandle: '#ff3333',
            colorHandleLine: '#ffaaaa',
            colorStroke: '#333',
            colorFill: 'rgba(0, 123, 255, 0.05)',
            colorSelection: 'rgba(0, 123, 255, 0.1)',
            gridSpacing: DEFAULT_GRID_SPACING,
            ...options
        };

        this.onSelectionChange = options.onSelectionChange || (() => { });



        this.activePath = null; // For pen tool
        this.previewPoint = null;
        this.selectionBox = null; // For drag selection preview
        this.previewOrigin = null; // For custom preview start point

        this.zoom = 1;
        this.pan = { x: 0, y: 0 };


        // Subscribe to store changes to re-render
        this.unsubscribe = useStore.subscribe((state, _) => {
            // Sync selection from store to local property
            // This fixes the stale node insertion issue while keeping compatibility with tools that write to selectedShapes
            // Sync zoom and pan if changed externally (e.g. from toolbar or input)
            if (state.zoom !== this.zoom || state.pan !== this.pan) {
                this.zoom = state.zoom;
                this.pan = state.pan;
                this.inputManager.setTransform(this.zoom, this.pan);
            }

            // Sync Snap Settings
            if (state.isSnappingEnabled !== this.snapManager.settings.enabled) {
                this.snapManager.settings.enabled = state.isSnappingEnabled;
            }
            this.render();
        });

        // Init input manager transform
        this.inputManager.setTransform(this.zoom, this.pan);

        // Initial Fit to Screen
        setTimeout(() => this.fitToScreen(), 0);

        this.render();
    }

    // Proxy getter to get shapes from store for tools usage
    get shapes(): IShape[] {
        return useStore.getState().shapes;
    }

    set shapes(value: IShape[]) {
        useStore.getState().setShapes(value);
    }

    // Proxy for selectedShapes. 
    get selectedShapes(): IShape[] {
        const { shapes, selectedShapes } = useStore.getState();
        return shapes.filter(s => selectedShapes.includes(s.id));
    }

    set selectedShapes(value: IShape[]) {
        const ids = value.map(s => s.id);
        useStore.getState().setSelectedShapes(ids);
    }

    set tool(value: any) {
        this.toolManager.setTool(value);
    }

    get tool() {
        return this.toolManager.currentToolType;
    }

    get activeLayerId() {
        return useStore.getState().activeLayerId;
    }

    get selectedNodeIndices() {
        return useStore.getState().selectedNodeIndices;
    }

    set selectedNodeIndices(value: number[]) {
        useStore.getState().setSelectedNodeIndices(value);
    }



    dispose() {
        this.inputManager.dispose();
        if (this.unsubscribe) this.unsubscribe();
    }

    getMousePos(evt: MouseEvent) {
        // Fallback or utility if needed, but tools should use the passed point preferably.
        // However, existing tools likely call this.editor.getMousePos(e).
        // So we should maintain this method, but delegate to InputManager logic or use stored transform.
        // Since InputManager is private essentially, we can reuse logic here.
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (evt.clientX - rect.left - this.pan.x) / this.zoom,
            y: (evt.clientY - rect.top - this.pan.y) / this.zoom
        };
    }

    // Tools might need to be refactored to accept {x, y} instead of just event?
    // Current tool interface: onMouseDown(e)
    // We can monkey-patch the event object to add worldX/worldY or pass it as second arg?
    // The existing code in PathEditor.handleMouseDown was: 
    // this.activeTool.onMouseDown(e);
    // Tools usually call this.editor.getMousePos(e).
    // So if we keep getMousePos working, tools don't need changes yet.
    // BUT the prompt says "PathEditor should delegate detection... and only receive clean events".
    // And "PathEditor... only receive clean events like onClick(worldX, worldY)".
    // So ideally handleMouseDown receives (worldX, worldY).
    // And we should probably pass that to the tool?
    // "activeTool.onMouseDown(e)" -> maybe "activeTool.onMouseDown(e, worldPos)"?
    // I will try to pass worldPos to tools if they support it, but for compatibility I'll ensure getMousePos still works.



    render() {
        // Read state from Store
        const { shapes, selectedShapes: selectedIds, tool, zoom, pan, layers, selectedNodeIndices } = useStore.getState();
        const selectedObjects = shapes.filter(s => selectedIds.includes(s.id));

        this.renderer.drawScene(
            shapes,
            selectedObjects,
            layers,
            this.config,
            tool,
            this.activePath,
            this.previewPoint,
            this.selectionBox, // Pass selection box from SelectTool
            zoom,
            pan, // Use pan directly from store state (destructured above)
            selectedNodeIndices,
            this.previewOrigin,
            useStore.getState().material // Pass material bounds to renderer
        );

        if (this.snapManager && this.snapManager.activeSnap) {
            this.renderer.drawSnapMarker(this.snapManager.activeSnap, zoom, pan);
        }

        this.onSelectionChange(selectedObjects);
    }

    /* ... Remaining methods unchanged ... */

    moveSelected(dx: number, dy: number) {
        if (this.selectedShapes.length > 0) {
            // We assume startAction is called by the tool onMouseDown
            const command = new MoveShapeCommand(this, this.selectedShapes, dx, dy);
            command.execute();
            this.render();
        }
    }

    deleteSelected() {
        if (this.selectedShapes.length > 0) {
            this.startAction();

            const command = new DeleteShapeCommand(this.selectedShapes);
            command.execute();

            this.render();
            this.endAction();
        }
    }

    clear() {
        this.startAction();
        useStore.getState().clearShapes();
        this.selectedShapes = [];
        this.render();
        this.endAction();
    }

    importSVGString(svgString: string, position: { x: number; y: number } | null = null) {
        try {
            this.startAction();

            const shapes = SVGImportService.import(svgString, {
                position,
                layerId: useStore.getState().activeLayerId
            });

            useStore.getState().addShapes(shapes);
            this.selectedShapes = shapes;
            this.render();
            this.endAction();
        } catch (e: any) {
            console.error("SVG Import Error:", e);
            alert(e.message || "Error importing SVG");
        }
    }

    performBooleanOperation(operation: 'unite' | 'subtract' | 'intersect' | 'exclude') {
        // Pass a copy of the array to command to avoid reference issues if state changes
        // although selectedShapes getter returns a new array filter.
        // It's safe.
        const paths = this.selectedShapes.filter(s => s.type === 'path') as PathShape[];
        if (paths.length === 0) return;
        const command = new BooleanCommand(paths, operation);
        this.history.execute(command);
    }

    applyStyle(style: Partial<IShape>) {
        if (this.selectedShapes.length === 0) return;

        const command = new UpdateStyleCommand(this.selectedShapes, style);
        this.history.execute(command);
    }

    groupSelected() {
        if (this.selectedShapes.length < 2) return;
        // Import GroupCommand dynamically or at top (need to add import)
        // assuming import I added earlier or will add
        const command = new GroupCommand(this.selectedShapes);
        this.history.execute(command);
    }

    ungroupSelected() {
        if (this.selectedShapes.length === 0) return;
        const groups = this.selectedShapes.filter(s => s.type === 'group');
        if (groups.length === 0) return;

        const command = new UngroupCommand(groups as any);
        this.history.execute(command);
    }
    updateShape(shape: IShape) {
        updateShapeGeometry(shape);
        useStore.getState().updateShape(shape);
    }


    resetZoom() {
        this.fitToScreen();
    }

    setZoom(value: number) {
        const newZoom = Math.max(0.1, Math.min(5, value));
        useStore.getState().setZoom(newZoom);
        // Note: unsubscribe listener will catch this update and update inputManager
    }

    // Note: unsubscribe listener will catch this update and update inputManager

    fitToScreen(margin: number = 40) {

        // Use canvas dimensions (which now track viewport)
        const containerWidth = this.canvas.width;
        const containerHeight = this.canvas.height;

        if (!containerWidth || !containerHeight) return;

        // Material dimensions (in pixels)
        const { width: matW, height: matH } = useStore.getState().material;

        // Calculate Scale
        const scaleX = (containerWidth - margin * 2) / matW;
        const scaleY = (containerHeight - margin * 2) / matH;
        // Actually fit usually allows zooming out, but maybe max 1.
        // Let's just use min(scaleX, scaleY) clamped for sanity.
        const clampedZoom = Math.max(0.01, Math.min(50, Math.min(scaleX, scaleY)));

        // Calculate Centering Pan
        // We want the scaled material to be centered in container.
        // ScaledDims = matW * zoom
        // MarginLeft = (ContainerW - ScaledDims) / 2
        // PanX should be that MarginLeft.
        const panX = (containerWidth - matW * clampedZoom) / 2;
        const panY = (containerHeight - matH * clampedZoom) / 2;

        useStore.getState().setZoom(clampedZoom);
        useStore.getState().setPan({ x: panX, y: panY });

        // Immediate render update in case store update is async/batched 
        // (though Zustand is usually sync, the subscription handles it)
    }

    /**
     * STEP 7: Simplified undo - now 100% Command Pattern.
     * No more state cloning!
     */
    undo(): void {
        this.history.undo();
        this.render();
    }

    /**
     * STEP 7: Simplified redo - now 100% Command Pattern.
     */
    redo(): void {
        this.history.redo();
        this.render();
    }

    /**
     * STEP 7: Temporary stub for backward compatibility.
     * Node manipulation methods still call this, but it's a no-op now.
     * TODO: Migrate node manipulation to use commands.
     */
    startAction(): void {
        // No-op: Commands handle history now
    }

    /**
     * STEP 7: Temporary stub for backward compatibility.
     */
    endAction(): void {
        // No-op: Commands handle history now
    }
}
