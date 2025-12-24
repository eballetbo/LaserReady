import { Geometry } from '../math/geometry.js';
import { CanvasRenderer } from '../render/canvas-renderer.js';
import { PathNode } from '../model/path-node';
import { PathShape } from '../model/path-shape';
import { RectTool, CircleTool, PolygonTool, StarTool } from '../tools/shape-tools.js';
import { PenTool } from '../tools/pen-tool.js';
import { SelectTool } from '../tools/select-tool.js';
import { TextTool } from '../tools/text-tool.js';
import { TextObject } from '../model/text-object.js';
import { NodeEditTool } from '../tools/node-edit-tool.js';
import { BooleanOperations } from '../math/boolean.js';
import { SVGImporter } from '../utils/svg-importer.js';
import { HistoryManager } from './history-manager.js';
import { useStore } from '../store/useStore';

/**
 * Main Editor Controller.
 */
export class PathEditor {
    constructor(canvasElement, options = {}) {
        this.canvas = canvasElement;
        this.ctx = this.canvas.getContext('2d');
        this.renderer = new CanvasRenderer(this.canvas);
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

        // this.shapes = []; // MOVED TO STORE
        // this.selectedShapes = []; // MOVED TO STORE

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
        this._tool = 'select'; // TODO: Sync with store tool? App sets editor.tool currently.
        this.activeTool = this.tools.select;

        this.activePath = null; // For pen tool
        this.previewPoint = null;
        this.selectedNodeIndex = null; // For node edit tool

        this.zoom = 1; // TODO: Sync with store
        this.pan = { x: 0, y: 0 };

        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);

        this.initEvents();

        // Subscribe to store changes to re-render
        // We only care about render-affecting state here.
        this.unsubscribe = useStore.subscribe((state, prevState) => {
            // For now, just render on any change. 
            // We can optimize later to check if shapes/selection/tool/zoom/material changed.
            this.render();
        });

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
    // Tools expect objects, but store has IDs.
    // We provide a getter that returns objects, and setter that sets IDs.
    get selectedShapes() {
        const { shapes, selectedShapes } = useStore.getState();
        return shapes.filter(s => selectedShapes.includes(s.id));
    }

    set selectedShapes(value) {
        // value is array of objects
        const ids = value.map(s => s.id);
        useStore.getState().setSelectedShapes(ids);
    }

    set tool(value) {
        this._tool = value;
        this.activeTool = this.tools[value] || this.tools.select;
        // Optionally update store tool if set locally
        // useStore.getState().setTool(value); 
        // But App.jsx sets editor.tool from store.tool, so avoid loop.
    }

    get tool() {
        return this._tool;
    }

    initEvents() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        this.canvas.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mouseup', this.handleMouseUp);
        window.addEventListener('keydown', this.handleKeyDown);
    }

    dispose() {
        this.canvas.removeEventListener('mousedown', this.handleMouseDown);
        this.canvas.removeEventListener('mousemove', this.handleMouseMove);
        window.removeEventListener('mouseup', this.handleMouseUp);
        window.removeEventListener('keydown', this.handleKeyDown);
        if (this.unsubscribe) this.unsubscribe();
    }

    getMousePos(evt) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (evt.clientX - rect.left - this.pan.x) / this.zoom,
            y: (evt.clientY - rect.top - this.pan.y) / this.zoom
        };
    }

    handleMouseDown(e) {
        this.startAction();
        if (this.activeTool) this.activeTool.onMouseDown(e);
    }

    handleMouseMove(e) {
        if (this.activeTool) this.activeTool.onMouseMove(e);
    }

    handleMouseUp(e) {
        if (this.activeTool) this.activeTool.onMouseUp(e);
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
        const { shapes, selectedShapes: selectedIds, tool, zoom } = useStore.getState();

        // Resolve selected objects
        const selectedObjects = shapes.filter(s => selectedIds.includes(s.id));

        // Use local zoom/pan or store zoom? Store has zoom.
        // App.jsx sets editor.zoom from store. So we can use this.zoom (which should be synced) 
        // OR use store zoom directly.
        // The instructions said "Modify PathEditor to call this renderer passing it the store data".
        // Let's use store zoom if available.
        // But pan is local.

        this.renderer.drawScene(
            shapes,
            selectedObjects,
            this.config,
            tool, // Use store tool? Or local active tool? Store tool is string.
            this.activePath,
            this.previewPoint,
            null, // selectionBox
            zoom, // Store zoom
            this.pan,
            this.selectedNodeIndex
        );

        // Notify selection change (Legacy support if App.jsx still uses it)
        this.onSelectionChange(selectedObjects);
    }

    deleteSelected() {
        // Use getters/setters which use store
        if (this.selectedShapes.length > 0) {
            this.startAction();

            const currentShapes = this.shapes;
            const currentSelected = this.selectedShapes;

            // Remove selected
            const newShapes = currentShapes.filter(s => !currentSelected.includes(s));

            this.shapes = newShapes;
            this.selectedShapes = [];

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

                // If position is provided, center the shapes at that position
                if (position) {
                    // Calculate combined bounds
                    const bounds = Geometry.getCombinedBounds(shapes);
                    const centerX = bounds.minX + bounds.width / 2;
                    const centerY = bounds.minY + bounds.height / 2;
                    const dx = position.x - centerX;
                    const dy = position.y - centerY;

                    // Move all shapes
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

                // Add to store via setter
                const currentShapes = this.shapes;
                this.shapes = [...currentShapes, ...shapes];
                this.selectedShapes = shapes; // Select imported shapes

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

        // Work with clones to avoid partial mutations before store update
        // Actually BooleanOperations likely returns NEW shapes
        const resultShapes = BooleanOperations.perform(this.selectedShapes, operation);

        // Remove original selected shapes
        const currentSelected = this.selectedShapes;
        const currentShapes = this.shapes;

        let newShapes = currentShapes.filter(s => !currentSelected.includes(s));

        // Add new shapes
        newShapes = [...newShapes, ...resultShapes];

        // Update Store
        this.shapes = newShapes;
        this.selectedShapes = resultShapes;

        this.render();
        this.endAction();
    }

    applyStyle(style) {
        if (this.selectedShapes.length === 0) return;

        this.startAction();

        const selected = this.selectedShapes;
        // Since we are using store, we should map to new objects if we want to be pure,
        // but PathShape is mutable class. 
        // If we mutate the objects inside the array, Zustand might not detect deep change unless we replace the array.
        // Or we should clone.

        // For now: mutate and reset array to trigger update.
        selected.forEach(shape => {
            if (style.strokeColor !== undefined) shape.strokeColor = style.strokeColor;
            if (style.strokeWidth !== undefined) shape.strokeWidth = style.strokeWidth;
            if (style.fillColor !== undefined) shape.fillColor = style.fillColor;
        });

        // Trigger store update by re-setting shapes
        this.shapes = [...this.shapes];

        this.render();
        this.endAction();
    }

    updateShape(shape) {
        if (!shape || !shape.type || !shape.params) return;

        this.startAction();

        // Mutate shape logic...
        // ... (Same logic as before) ...
        // Regenerate nodes based on type
        if (shape.type === 'polygon' && shape.params.sides) {
            // Calculate centroid (average of all points)
            let cx = 0, cy = 0;
            shape.nodes.forEach(n => { cx += n.x; cy += n.y; });
            const center = { x: cx / shape.nodes.length, y: cy / shape.nodes.length };

            // Calculate average radius
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
            // ... (Same logic as before) ...
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

        // Update Store
        this.shapes = [...this.shapes];

        this.render();
        this.endAction();
    }

    startAction() {
        // Snapshot current shapes from store
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

            // Set to store
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
        // Update store zoom
        useStore.getState().setZoom(1);
        // Local pan reset
        this.pan = { x: 0, y: 0 };
        this.render();
    }

    setZoom(value) {
        const newZoom = Math.max(0.1, Math.min(5, value));
        useStore.getState().setZoom(newZoom);
        this.render();
    }
}
