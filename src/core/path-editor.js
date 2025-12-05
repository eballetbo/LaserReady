import { Geometry } from '../math/geometry.js';
import { CanvasRenderer } from '../render/canvas-renderer.js';
import { PathNode } from '../model/path-node.js';
import { PathShape } from '../model/path-shape.js';
import { RectTool, CircleTool, PolygonTool, StarTool } from '../tools/shape-tools.js';
import { PenTool } from '../tools/pen-tool.js';
import { SelectTool } from '../tools/select-tool.js';
import { NodeEditTool } from '../tools/node-edit-tool.js';
import { BooleanOperations } from '../math/boolean.js';
import { SVGImporter } from '../utils/svg-importer.js';
import { HistoryManager } from './history-manager.js';

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
            gridSpacing: 40,
            ...options
        };

        this.onSelectionChange = options.onSelectionChange || (() => { });

        this.shapes = [];
        this.selectedShapes = [];
        this.tools = {
            select: new SelectTool(this),
            rect: new RectTool(this),
            circle: new CircleTool(this),

            triangle: new PolygonTool(this, 3),
            pentagon: new PolygonTool(this, 5),
            polygon: new PolygonTool(this, 6),
            star: new StarTool(this),
            pen: new PenTool(this),
            'node-edit': new NodeEditTool(this)
        };
        this._tool = 'select';
        this.activeTool = this.tools.select;

        this.activePath = null;
        this.previewPoint = null;

        this.zoom = 1;
        this.pan = { x: 0, y: 0 };

        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);

        this.initEvents();
        this.render();
    }

    set tool(value) {
        this._tool = value;
        this.activeTool = this.tools[value] || this.tools.select;
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
        this.renderer.drawScene(
            this.shapes,
            this.selectedShapes,
            this.config,
            this.tool,
            this.activePath,
            this.previewPoint,
            null, // selectionBox
            this.zoom,
            this.pan
        );

        // Notify selection change
        this.onSelectionChange(this.selectedShapes);
    }

    deleteSelected() {
        if (this.selectedShapes.length > 0) {
            this.startAction();
            this.selectedShapes.forEach(shape => {
                const index = this.shapes.indexOf(shape);
                if (index > -1) {
                    this.shapes.splice(index, 1);
                }
            });
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

                this.shapes.push(...shapes);
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

        const resultShapes = BooleanOperations.perform(this.selectedShapes, operation);

        // Remove original selected shapes
        this.selectedShapes.forEach(shape => {
            const index = this.shapes.indexOf(shape);
            if (index > -1) this.shapes.splice(index, 1);
        });

        // Add new shapes
        this.shapes.push(...resultShapes);

        // Select result
        this.selectedShapes = resultShapes;
        this.render();
        this.endAction();
    }

    applyStyle(style) {
        if (this.selectedShapes.length === 0) return;

        this.startAction();
        this.selectedShapes.forEach(shape => {
            if (style.strokeColor !== undefined) shape.strokeColor = style.strokeColor;
            if (style.strokeWidth !== undefined) shape.strokeWidth = style.strokeWidth;
            if (style.fillColor !== undefined) shape.fillColor = style.fillColor;
        });
        this.render();
        this.endAction();
    }

    updateShape(shape) {
        if (!shape || !shape.type || !shape.params) return;

        this.startAction();

        // Regenerate nodes based on type
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
            // Calculate centroid (average of all points)
            let cx = 0, cy = 0;
            shape.nodes.forEach(n => { cx += n.x; cy += n.y; });
            const center = { x: cx / shape.nodes.length, y: cy / shape.nodes.length };

            // Calculate current outer radius
            // Find the point furthest from center to be the outer radius
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

        this.render();
        this.endAction();
    }

    startAction() {
        this.actionStartState = JSON.stringify(this.shapes);
    }

    endAction() {
        if (!this.actionStartState) return;

        const currentStateStr = JSON.stringify(this.shapes);
        if (currentStateStr !== this.actionStartState) {
            // State changed, push the START state to undo stack
            const startState = JSON.parse(this.actionStartState);
            // Re-hydrate shapes before pushing? 
            // HistoryManager stores whatever we give it. 
            // If we give it plain objects, it stores plain objects.
            // If we give it PathShapes, it stores PathShapes (but they get stringified anyway).
            // So it doesn't matter what we push, as long as we re-hydrate on retrieval.
            // But wait, HistoryManager.push does JSON.stringify internally for duplicate check?
            // No, I added that.
            // So we can push plain objects.
            this.history.push(startState);
        }
        this.actionStartState = null;
    }

    undo() {
        // We need to save current state to redo stack before restoring previous state.
        // But HistoryManager.undo handles the swap.
        // We just need to give it the current state (as plain objects or shapes? HistoryManager doesn't care).
        // BUT, if we give it shapes, and it pushes to redo stack, when we redo, we get shapes back?
        // No, HistoryManager is in-memory, so if we push objects, they stay objects.
        // BUT, we are using JSON.stringify/parse in startAction/endAction, so we are dealing with plain objects there.
        // Let's consistently use PathShape instances in the editor, and re-hydrate from history.

        const currentState = this.shapes.map(shape => shape.clone()); // These are PathShapes
        const previousState = this.history.undo(currentState);

        if (previousState) {
            // previousState might be plain objects if it came from endAction's JSON.parse
            // OR it might be PathShapes if it came from a previous undo/redo cycle?
            // Let's assume it can be plain objects and re-hydrate.
            this.shapes = previousState.map(s => {
                return s instanceof PathShape ? s : PathShape.fromJSON(s);
            });
            this.selectedShapes = []; // Clear selection to avoid issues
            this.render();
        }
    }

    redo() {
        const currentState = this.shapes.map(shape => shape.clone());
        const nextState = this.history.redo(currentState);

        if (nextState) {
            this.shapes = nextState.map(s => {
                return s instanceof PathShape ? s : PathShape.fromJSON(s);
            });
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
        this.zoom = 1;
        this.pan = { x: 0, y: 0 };
        this.render();
    }

    setZoom(value) {
        this.zoom = Math.max(0.1, Math.min(5, value));
        this.render();
    }
}
