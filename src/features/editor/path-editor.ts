// @ts-nocheck - Progressive TypeScript migration, refine types incrementally
import { Geometry } from '../../math/geometry';
import { CanvasRenderer } from '../../render/canvas-renderer';
import { InputManager } from './input-manager';
import { PathNode } from '../shapes/path-node';
import { PathShape } from '../shapes/path-shape';
import { RectTool, CircleTool, PolygonTool, StarTool } from '../shapes/shape-tools';
import { PenTool } from '../../tools/pen-tool';
import { SelectTool } from '../../tools/select-tool';
import { TextTool } from '../../tools/text-tool';
import { TextObject } from '../../model/text-object';
import { NodeEditTool } from '../../tools/node-edit-tool';
import { BooleanOperations } from '../../math/boolean';
import { SVGImporter } from '../../utils/svg-importer';
import { HistoryManager } from './history-manager.js';
import { useStore } from '../../store/useStore';
import { DeleteShapeCommand } from '../../commands/delete-shape-command';
import { MoveShapeCommand } from '../../commands/move-shape-command';

/**
 * Main Editor Controller.
 */
export class PathEditor {
    constructor(canvasElement, options = {}) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.renderer = new CanvasRenderer(this.canvas);
        this.inputManager = new InputManager(this.canvas);
        this.history = new HistoryManager();

        this.config = {
            anchorSize: 8,
            handleRadius: 5,
            colorAnchor: '#007bff',
            colorHandle: '#ff3333',
            colorHandleLine: '#ffaaaa',
            colorStroke: '#333',
            colorFill: 'rgba(0, 123, 255, 0.05)',
            colorSelection: 'rgba(0, 123, 255, 0.1)',
            gridSpacing: 40,
            ...options
        };

        this.onSelectionChange = options.onSelectionChange || (() => { });

        this.tools = {
            select: new SelectTool(this),
            rect: new RectTool(this),
            circle: new CircleTool(this),
            text: new TextTool(this),

            triangle: new PolygonTool(this, 3),
            pentagon: new PolygonTool(this, 5),
            polygon: new PolygonTool(this, 6),
            star: new StarTool(this),
            pen: new PenTool(this),
            'node-edit': new NodeEditTool(this)
        };
        this._tool = 'select';
        this.activeTool = this.tools.select;

        this.activePath = null; // For pen tool
        this.previewPoint = null;
        this.selectedNodeIndex = null; // For node edit tool

        this.zoom = 1;
        this.pan = { x: 0, y: 0 };

        this.initEvents();

        // Subscribe to store changes to re-render
        this.unsubscribe = useStore.subscribe((state, prevState) => {
            // Sync zoom if changed externally (e.g. from toolbar)
            if (state.zoom !== this.zoom) {
                this.zoom = state.zoom;
                this.inputManager.setTransform(this.zoom, this.pan);
            }
            this.render();
        });

        // Init input manager transform
        this.inputManager.setTransform(this.zoom, this.pan);

        this.render();
    }

    // Proxy getter to get shapes from store for tools usage
    get shapes() {
        return useStore.getState().shapes;
    }

    set shapes(value) {
        useStore.getState().setShapes(value);
    }

    // Proxy for selectedShapes. 
    get selectedShapes() {
        const { shapes, selectedShapes } = useStore.getState();
        return shapes.filter(s => selectedShapes.includes(s.id));
    }

    set selectedShapes(value) {
        const ids = value.map(s => s.id);
        useStore.getState().setSelectedShapes(ids);
    }

    set tool(value) {
        this._tool = value;
        this.activeTool = this.tools[value] || this.tools.select;
    }

    get tool() {
        return this._tool;
    }

    get activeLayerId() {
        return useStore.getState().activeLayerId;
    }

    initEvents() {
        // Delegate to InputManager
        this.inputManager.on('down', (x, y, e) => {
            this.handleMouseDown(e, { x, y });
        });

        this.inputManager.on('move', (x, y, e) => {
            this.handleMouseMove(e, { x, y });
        });

        this.inputManager.on('up', (x, y, e) => {
            this.handleMouseUp(e, { x, y });
        });

        this.inputManager.on('keydown', (e) => {
            this.handleKeyDown(e);
        });
    }

    dispose() {
        this.inputManager.dispose();
        if (this.unsubscribe) this.unsubscribe();
    }

    getMousePos(evt) {
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

    handleMouseDown(e, worldPos) {
        this.startAction();
        // We attach worldPos to event for convenience? Or pass as 2nd arg.
        // Let's pass as 2nd arg. Tools might ignore it if not updated.
        // But wait, if tools rely on editor.getMousePos(e), they will re-calculate it.
        // That's duplicate work but safe.
        // Optimally, update tools. But user didn't ask to update tools.
        if (this.activeTool) this.activeTool.onMouseDown(e, worldPos);
    }

    handleMouseMove(e, worldPos) {
        if (this.activeTool) this.activeTool.onMouseMove(e, worldPos);
    }

    handleMouseUp(e, worldPos) {
        if (this.activeTool) this.activeTool.onMouseUp(e, worldPos);
        this.endAction();
    }

    handleKeyDown(e) {
        // Ignore keys handled by App.jsx or that shouldn't trigger a save
        if (e.key === 'Delete' || e.key === 'Backspace') return;
        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'y')) return;

        this.startAction();
        if (this.activeTool) this.activeTool.onKeyDown(e);
        this.endAction();
    }

    render() {
        // Read state from Store
        const { shapes, selectedShapes: selectedIds, tool, zoom, layers } = useStore.getState();
        const selectedObjects = shapes.filter(s => selectedIds.includes(s.id));

        this.renderer.drawScene(
            shapes,
            selectedObjects,
            layers,
            this.config,
            tool,
            this.activePath,
            this.previewPoint,
            null, // selectionBox
            zoom,
            this.pan,
            this.selectedNodeIndex
        );

        this.onSelectionChange(selectedObjects);
    }

    /* ... Remaining methods unchanged ... */

    moveSelected(dx, dy) {
        if (this.selectedShapes.length > 0) {
            // We assume startAction is called by the tool onMouseDown
            const command = new MoveShapeCommand(this.selectedShapes, dx, dy);
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
        this.shapes = [];
        this.selectedShapes = [];
        this.render();
        this.endAction();
    }

    importSVGString(svgString, position = null) {
        try {
            const shapes = SVGImporter.importSVG(svgString);
            if (shapes && shapes.length > 0) {
                this.startAction();

                if (position) {
                    const bounds = Geometry.getCombinedBounds(shapes);
                    const centerX = bounds.minX + bounds.width / 2;
                    const centerY = bounds.minY + bounds.height / 2;
                    const dx = position.x - centerX;
                    const dy = position.y - centerY;

                    shapes.forEach(shape => {
                        shape.nodes.forEach(node => {
                            node.x += dx;
                            node.y += dy;
                            node.cpIn.x += dx;
                            node.cpIn.y += dy;
                            node.cpOut.x += dx;
                            node.cpOut.y += dy;
                        });
                    });
                }

                // Assign active layer to imported shapes
                const activeLayerId = useStore.getState().activeLayerId;
                shapes.forEach(shape => shape.layerId = activeLayerId);

                const currentShapes = this.shapes;
                this.shapes = [...currentShapes, ...shapes];
                this.selectedShapes = shapes;

                this.render();
                this.endAction();
            } else {
                alert("No valid shapes found in SVG");
            }
        } catch (e) {
            console.error("SVG Import Error:", e);
            alert("Error importing SVG");
        }
    }

    performBooleanOperation(operation) {
        if (this.selectedShapes.length < 2) return;
        this.startAction();
        const resultShapes = BooleanOperations.perform(this.selectedShapes, operation);
        const currentSelected = this.selectedShapes;
        const currentShapes = this.shapes;
        let newShapes = currentShapes.filter(s => !currentSelected.includes(s));
        newShapes = [...newShapes, ...resultShapes];
        this.shapes = newShapes;
        this.selectedShapes = resultShapes;
        this.render();
        this.endAction();
    }

    applyStyle(style) {
        if (this.selectedShapes.length === 0) return;
        this.startAction();
        const selected = this.selectedShapes;
        selected.forEach(shape => {
            if (style.strokeColor !== undefined) shape.strokeColor = style.strokeColor;
            if (style.strokeWidth !== undefined) shape.strokeWidth = style.strokeWidth;
            if (style.fillColor !== undefined) shape.fillColor = style.fillColor;
        });
        this.shapes = [...this.shapes];
        this.render();
        this.endAction();
    }

    updateShape(shape) {
        if (!shape || !shape.type || !shape.params) return;
        this.startAction();

        if (shape.type === 'polygon' && shape.params.sides) {
            let cx = 0, cy = 0;
            shape.nodes.forEach(n => { cx += n.x; cy += n.y; });
            const center = { x: cx / shape.nodes.length, y: cy / shape.nodes.length };
            let totalRadius = 0;
            shape.nodes.forEach(n => {
                const dx = n.x - center.x;
                const dy = n.y - center.y;
                totalRadius += Math.sqrt(dx * dx + dy * dy);
            });
            const radius = totalRadius / shape.nodes.length;
            const sides = shape.params.sides;
            const newNodes = [];
            for (let i = 0; i < sides; i++) {
                const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
                const x = center.x + radius * Math.cos(angle);
                const y = center.y + radius * Math.sin(angle);
                const node = new PathNode(x, y);
                node.cpIn = { x, y };
                node.cpOut = { x, y };
                newNodes.push(node);
            }
            shape.nodes = newNodes;
        }

        if (shape.type === 'star' && shape.params.points && shape.params.innerRadius) {
            let cx = 0, cy = 0;
            shape.nodes.forEach(n => { cx += n.x; cy += n.y; });
            const center = { x: cx / shape.nodes.length, y: cy / shape.nodes.length };
            let maxDist = 0;
            shape.nodes.forEach(n => {
                const dx = n.x - center.x;
                const dy = n.y - center.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > maxDist) maxDist = dist;
            });
            const outerRadius = maxDist;
            const innerRadius = outerRadius * shape.params.innerRadius;
            const points = shape.params.points;
            const newNodes = [];
            for (let i = 0; i < points * 2; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (i * Math.PI / points) - Math.PI / 2;
                const x = center.x + radius * Math.cos(angle);
                const y = center.y + radius * Math.sin(angle);
                const node = new PathNode(x, y);
                node.cpIn = { x, y };
                node.cpOut = { x, y };
                newNodes.push(node);
            }
            shape.nodes = newNodes;
        }

        this.shapes = [...this.shapes];
        this.render();
        this.endAction();
    }

    startAction() {
        this.actionStartState = JSON.stringify(this.shapes);
    }

    endAction() {
        if (!this.actionStartState) return;
        const currentShapes = this.shapes;
        const currentStateStr = JSON.stringify(currentShapes);
        if (currentStateStr !== this.actionStartState) {
            const startState = JSON.parse(this.actionStartState);
            this.history.push(startState);
        }
        this.actionStartState = null;
    }

    undo() {
        const currentState = this.shapes.map(shape => shape.clone());
        const previousState = this.history.undo(currentState);
        if (previousState) {
            const restoredShapes = previousState.map(s => {
                if (s instanceof PathShape || s instanceof TextObject) return s;
                if (s.type === 'text') return TextObject.fromJSON(s);
                return PathShape.fromJSON(s);
            });
            this.shapes = restoredShapes;
            this.selectedShapes = [];
            this.render();
        }
    }

    redo() {
        const currentState = this.shapes.map(shape => shape.clone());
        const nextState = this.history.redo(currentState);
        if (nextState) {
            const restoredShapes = nextState.map(s => {
                if (s instanceof PathShape || s instanceof TextObject) return s;
                if (s.type === 'text') return TextObject.fromJSON(s);
                return PathShape.fromJSON(s);
            });
            this.shapes = restoredShapes;
            this.selectedShapes = [];
            this.render();
        }
    }

    zoomIn() {
        this.setZoom(this.zoom * 1.2);
    }

    zoomOut() {
        this.setZoom(this.zoom / 1.2);
    }

    resetZoom() {
        useStore.getState().setZoom(1);
        this.pan = { x: 0, y: 0 };
        this.inputManager.setTransform(1, this.pan);
        this.render();
    }

    setZoom(value) {
        const newZoom = Math.max(0.1, Math.min(5, value));
        useStore.getState().setZoom(newZoom);
        // Note: unsubscribe listener will catch this update and update inputManager
    }
}
