import { EDITOR_CONFIG, MIN_ZOOM, MAX_ZOOM } from '../../config/constants';
import { CanvasRenderer, CanvasLayers, TextEditingState } from './render/renderer';
import { RendererConfig } from './render/types';
import { InputManager } from './input';
import { ToolManager } from './tool-manager';
import { ToolType } from '../../config/shortcuts';
import { PathShape } from '../shapes/models/path';
import { IShape } from '../shapes/types';
import { SVGImportService } from '../../features/io/svg-import';
import { HistoryManager } from './history';
import { SnapManager } from './snapping';
import { useStore } from '../../store/useStore';
import { DeleteShapeCommand } from '../shapes/commands/delete';
import { MoveShapeCommand } from '../shapes/commands/move';
import { UpdateStyleCommand } from '../shapes/commands/style';
import { BooleanCommand } from '../shapes/commands/boolean';
import { GroupCommand } from '../shapes/commands/group';
import { UngroupCommand } from '../shapes/commands/ungroup';
import { ImportShapesCommand } from '../shapes/commands/import';
import { DuplicateCommand } from '../shapes/commands/duplicate';
import { ZOrderCommand } from '../shapes/commands/zorder';
import { updateShapeGeometry } from './utils/geometry-updater';
import { notify } from '../ui/toast-utils';

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
    selectedShape?: IShape;
    private animationFrameId: number | null = null;
    private lastFrameTime: number = 0;
    private renderPending: boolean = false;
    private lastSelectionIds: string = '';
    private renderFrameId: number | null = null;

    private dirtyFlags = {
        background: true,
        content: true,
        overlay: true,
    };

    constructor(layers: CanvasLayers, options: Partial<RendererConfig> & { onSelectionChange?: (s: IShape[]) => void } = {}) {
        this.canvas = layers.overlay;
        this.ctx = this.canvas.getContext('2d')!;
        this.config = {
            ...EDITOR_CONFIG,
            ...options
        };
        this.renderer = new CanvasRenderer(layers);
        this.inputManager = new InputManager(this.canvas);
        this.toolManager = new ToolManager(this, this.inputManager);
        this.history = new HistoryManager();
        this.snapManager = new SnapManager(this);

        this.onSelectionChange = options.onSelectionChange || (() => { });

        this.activePath = null;
        this.previewPoint = null;
        this.selectionBox = null;
        this.previewOrigin = null;

        this.zoom = 1;
        this.pan = { x: 0, y: 0 };

        let prevState = useStore.getState();
        this.unsubscribe = useStore.subscribe((state) => {
            const zoomPanChanged = state.zoom !== this.zoom || state.pan !== this.pan;

            if (zoomPanChanged) {
                this.zoom = state.zoom;
                this.pan = state.pan;
                this.inputManager.setTransform(this.zoom, this.pan);
                this.dirtyFlags.background = true;
                this.dirtyFlags.content = true;
                this.dirtyFlags.overlay = true;
            }

            if (state.isSnappingEnabled !== this.snapManager.settings.enabled) {
                this.snapManager.settings.enabled = state.isSnappingEnabled;
            }

            if (state.shapes !== prevState.shapes || state.layers !== prevState.layers) {
                this.dirtyFlags.content = true;
                this.dirtyFlags.overlay = true;
            }

            if (state.selectedShapes !== prevState.selectedShapes ||
                state.selectedNodeIndices !== prevState.selectedNodeIndices ||
                state.tool !== prevState.tool) {
                this.dirtyFlags.overlay = true;
            }

            if (state.material !== prevState.material) {
                this.dirtyFlags.background = true;
            }

            const hasSelection = state.selectedShapes.length > 0 && state.tool === 'select';
            if (hasSelection && !this.animationFrameId) {
                this.startSelectionAnimation();
            } else if (!hasSelection && this.animationFrameId && !this.isEditingText()) {
                this.stopSelectionAnimation();
            }

            const anyDirty = this.dirtyFlags.background || this.dirtyFlags.content || this.dirtyFlags.overlay;

            prevState = state;

            if (anyDirty) {
                this.scheduleRender();
            }
        });

        this.inputManager.setTransform(this.zoom, this.pan);
        setTimeout(() => this.fitToScreen(), 0);
        this.render();
    }

    get shapes(): IShape[] {
        return useStore.getState().shapes;
    }

    set shapes(value: IShape[]) {
        useStore.getState().setShapes(value);
    }

    get selectedShapes(): IShape[] {
        const { shapes, selectedShapes } = useStore.getState();
        return shapes.filter(s => selectedShapes.includes(s.id));
    }

    set selectedShapes(value: IShape[]) {
        const ids = value.map(s => s.id);
        useStore.getState().setSelectedShapes(ids);
    }

    set tool(value: ToolType) {
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
        this.stopSelectionAnimation();
        if (this.renderFrameId) cancelAnimationFrame(this.renderFrameId);
        this.inputManager.dispose();
        if (this.unsubscribe) this.unsubscribe();
    }

    private startSelectionAnimation(): void {
        if (this.animationFrameId) return;
        this.lastFrameTime = performance.now();
        const animate = (currentTime: number) => {
            const deltaTime = currentTime - this.lastFrameTime;
            this.lastFrameTime = currentTime;
            this.renderer.updateDashAnimation(deltaTime);
            this.dirtyFlags.overlay = true;
            this.renderImmediate();
            this.animationFrameId = requestAnimationFrame(animate);
        };
        this.animationFrameId = requestAnimationFrame(animate);
    }

    private stopSelectionAnimation(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
    }

    getMousePos(evt: MouseEvent) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (evt.clientX - rect.left - this.pan.x) / this.zoom,
            y: (evt.clientY - rect.top - this.pan.y) / this.zoom
        };
    }

    private scheduleRender() {
        if (this.renderPending) return;
        this.renderPending = true;
        this.renderFrameId = requestAnimationFrame(() => {
            this.renderPending = false;
            this.renderImmediate();
        });
    }

    render() {
        this.dirtyFlags.background = true;
        this.dirtyFlags.content = true;
        this.dirtyFlags.overlay = true;
        this.scheduleRender();
    }

    renderOverlay() {
        this.dirtyFlags.overlay = true;
        this.scheduleRender();
    }

    private isEditingText(): boolean {
        const textTool = this.toolManager.tools['text'] as any;
        return !!(textTool?.activeText);
    }

    renderImmediate() {
        const { shapes, selectedShapes: selectedIds, tool, zoom, pan, layers, selectedNodeIndices, selectedSegmentIndices, hoveredNodeIndex, hoveredSegmentIndex } = useStore.getState();
        const selectedObjects = shapes.filter(s => selectedIds.includes(s.id));

        let textEditing: TextEditingState | null = null;
        if (tool === 'text' && this.isEditingText()) {
            const textTool = this.toolManager.tools['text'] as any;
            textEditing = {
                textId: textTool.activeText.id,
                cursorPosition: textTool.cursorPosition ?? 0
            };
            if (!this.animationFrameId) {
                this.startSelectionAnimation();
            }
        } else if (this.animationFrameId && !(selectedIds.length > 0 && tool === 'select')) {
            this.stopSelectionAnimation();
        }

        if (this.dirtyFlags.background) {
            this.renderer.drawBackground(zoom, pan, useStore.getState().material, this.config);
            this.dirtyFlags.background = false;
        }

        if (this.dirtyFlags.content) {
            this.renderer.drawContent(shapes, layers, this.config, tool, zoom, pan);
            this.dirtyFlags.content = false;
        }

        if (this.dirtyFlags.overlay) {
            const snapResult = this.snapManager?.activeSnap ?? null;

            this.renderer.drawOverlay(
                shapes,
                selectedObjects,
                layers,
                this.config,
                tool,
                this.activePath,
                this.previewPoint,
                this.selectionBox,
                zoom,
                pan,
                selectedNodeIndices,
                selectedSegmentIndices,
                hoveredNodeIndex,
                hoveredSegmentIndex,
                this.previewOrigin,
                textEditing,
                snapResult
            );

            if (this.toolManager.activeTool && 'drawOverlay' in this.toolManager.activeTool) {
                (this.toolManager.activeTool as any).drawOverlay(this.ctx);
            }

            this.dirtyFlags.overlay = false;
        }

        const selectionKey = selectedIds.join(',');
        if (selectionKey !== this.lastSelectionIds) {
            this.lastSelectionIds = selectionKey;
            this.onSelectionChange(selectedObjects);
        }
    }

    moveSelected(dx: number, dy: number) {
        if (this.selectedShapes.length > 0) {
            const command = new MoveShapeCommand(this, this.selectedShapes, dx, dy);
            command.execute();
            this.render();
        }
    }

    deleteSelected() {
        if (this.selectedShapes.length > 0) {
            const command = new DeleteShapeCommand(this.selectedShapes);
            this.history.execute(command);
            this.render();
        }
    }

    clear() {
        const allShapes = this.shapes;
        if (allShapes.length === 0) return;
        const command = new DeleteShapeCommand(allShapes);
        this.history.execute(command);
        this.render();
    }

    importSVGString(svgString: string, position: { x: number; y: number } | null = null) {
        try {
            const shapes = SVGImportService.import(svgString, {
                position,
                layerId: useStore.getState().activeLayerId
            });

            const command = new ImportShapesCommand(shapes);
            this.history.execute(command);
            this.render();
        } catch (e: any) {
            console.error("SVG Import Error:", e);
            notify(e.message || "Error importing SVG", 'error');
        }
    }

    performBooleanOperation(operation: 'unite' | 'subtract' | 'intersect' | 'exclude') {
        const paths = this.selectedShapes.filter(s => s instanceof PathShape) as PathShape[];
        if (paths.length < 2) return;
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

    private clipboard: IShape[] = [];

    copy() {
        if (this.selectedShapes.length === 0) return;
        this.clipboard = this.selectedShapes
            .filter(s => typeof s.clone === 'function')
            .map(s => s.clone!());
    }

    cut() {
        this.copy();
        this.deleteSelected();
    }

    paste() {
        if (this.clipboard.length === 0) return;
        const pasted = this.clipboard
            .filter(s => typeof s.clone === 'function')
            .map(s => {
                const clone = s.clone!();
                clone.id = crypto.randomUUID();
                if (clone.move) clone.move(10, 10);
                return clone;
            });
        if (pasted.length === 0) return;
        const command = new ImportShapesCommand(pasted);
        this.history.execute(command);
        this.clipboard = pasted.filter(s => typeof s.clone === 'function').map(s => s.clone!());
    }

    duplicate() {
        if (this.selectedShapes.length === 0) return;
        const command = new DuplicateCommand(this.selectedShapes);
        this.history.execute(command);
    }

    newDocument() {
        useStore.getState().clearShapes();
        this.history.clear();
        this.activePath = null;
        this.previewPoint = null;
        this.selectionBox = null;
        this.clipboard = [];
        this.fitToScreen();
        this.render();
    }

    selectAll() {
        this.selectedShapes = [...this.shapes];
        this.render();
    }

    nudge(dx: number, dy: number) {
        if (this.selectedShapes.length === 0) return;
        const command = new MoveShapeCommand(this, this.selectedShapes, dx, dy);
        this.history.execute(command);
        this.render();
    }

    bringForward() {
        if (this.selectedShapes.length === 0) return;
        this.history.execute(new ZOrderCommand(this.selectedShapes, 'bringForward'));
        this.render();
    }

    sendBackward() {
        if (this.selectedShapes.length === 0) return;
        this.history.execute(new ZOrderCommand(this.selectedShapes, 'sendBackward'));
        this.render();
    }

    bringToFront() {
        if (this.selectedShapes.length === 0) return;
        this.history.execute(new ZOrderCommand(this.selectedShapes, 'bringToFront'));
        this.render();
    }

    sendToBack() {
        if (this.selectedShapes.length === 0) return;
        this.history.execute(new ZOrderCommand(this.selectedShapes, 'sendToBack'));
        this.render();
    }

    updateShape(shape: IShape) {
        updateShapeGeometry(shape);
        useStore.getState().updateShape(shape);
    }

    resetZoom() {
        this.fitToScreen();
    }

    setZoom(value: number) {
        const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));
        useStore.getState().setZoom(newZoom);
    }

    fitToScreen(margin: number = 40) {
        const containerWidth = this.canvas.width;
        const containerHeight = this.canvas.height;

        if (!containerWidth || !containerHeight) return;

        const { width: matW, height: matH } = useStore.getState().material;

        const scaleX = (containerWidth - margin * 2) / matW;
        const scaleY = (containerHeight - margin * 2) / matH;
        const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min(scaleX, scaleY)));

        const panX = (containerWidth - matW * clampedZoom) / 2;
        const panY = (containerHeight - matH * clampedZoom) / 2;

        useStore.getState().setZoom(clampedZoom);
        useStore.getState().setPan({ x: panX, y: panY });
    }

    undo(): void {
        this.history.undo();
        this.render();
    }

    redo(): void {
        this.history.redo();
        this.render();
    }
}
