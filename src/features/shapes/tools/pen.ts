import { BaseTool, IEditorContext } from '../../../core/tools/base';
import { PathNode } from '../models/node';
import { PathShape } from '../models/path';
import { CanvasController } from '../../editor/controller';
import { Geometry } from '../../../core/math/geometry';
import { CreateShapeCommand } from '../commands/create';

interface DraggingItem {
    type: string;
    index: number;
}

export class PenTool extends BaseTool {
    draggingItem: DraggingItem | null;
    continuingFromEnd: boolean = true;

    constructor(editor: CanvasController) {
        super(editor);
        this.draggingItem = null;
        this.continuingFromEnd = false;
    }

    onMouseDown(e: MouseEvent) {
        let { x, y } = this.editor.getMousePos(e);

        // SHIFT CONSTRAINING: Apply to node placement
        if (e.shiftKey && this.editor.activePath && this.editor.activePath.nodes.length > 0) {
            const lastNode = this.editor.activePath.nodes[this.editor.activePath.nodes.length - 1];
            const dx = x - lastNode.x;
            const dy = y - lastNode.y;
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            const snapAngle = Math.round(angle / 45) * 45;
            const distance = Math.sqrt(dx * dx + dy * dy);
            x = lastNode.x + distance * Math.cos(snapAngle * Math.PI / 180);
            y = lastNode.y + distance * Math.sin(snapAngle * Math.PI / 180);
        }

        if (!this.editor.activePath) {
            // Check for path continuation (unless Ctrl/Cmd is held)
            // Snap radius: 25px (default) or 100px (Alt)
            const snapRadius = e.altKey ? 100 : 25;
            let pathToContinue: any = null;
            let continueFromEnd = true;

            if (!(e.ctrlKey || e.metaKey)) {
                for (const shape of this.editor.shapes) {
                    if (shape.type === 'path' && !shape.closed && shape.nodes && shape.nodes.length > 0) {
                        const firstNode = shape.nodes[0];
                        const lastNode = shape.nodes[shape.nodes.length - 1];
                        const distToFirst = Geometry.getDistance({ x, y }, { x: firstNode.x, y: firstNode.y });
                        const distToLast = Geometry.getDistance({ x, y }, { x: lastNode.x, y: lastNode.y });

                        if (distToFirst <= snapRadius) {
                            pathToContinue = shape;
                            continueFromEnd = false; // Prepend
                            break;
                        } else if (distToLast <= snapRadius) {
                            pathToContinue = shape;
                            continueFromEnd = true; // Append
                            break;
                        }
                    }
                }

                if (pathToContinue) {
                    this.editor.activePath = pathToContinue;
                    this.continuingFromEnd = continueFromEnd;
                    // Don't add a node yet - just activate the path for continuation
                    // The next click will add the node
                    this.editor.render();
                    return;
                }

                // Start new path
                const startNode = new PathNode(x, y);
                this.editor.activePath = new PathShape([startNode], false, this.editor.activeLayerId);
                this.editor.shapes.push(this.editor.activePath);
                this.draggingItem = { type: 'anchor', index: 0 };
                this.continuingFromEnd = true; // New paths always append
            } else {
                // Continue path
                const startNode = this.editor.activePath.nodes[0];
                const distToStart = Geometry.getDistance({ x, y }, { x: startNode.x, y: startNode.y });

                // Snap radius: 25px for easier closing
                const snapRadius = 25;

                if (this.editor.activePath.nodes.length > 2 && distToStart <= snapRadius) {
                    // Close path
                    this.editor.activePath.closed = true;
                    this.editor.activePath = null;
                    this.editor.previewPoint = null;
                } else {

                    // Add new node
                    const newNode = new PathNode(x, y);

                    if (this.continuingFromEnd) {
                        this.editor.activePath.nodes.push(newNode);
                        this.draggingItem = { type: 'anchor', index: this.editor.activePath.nodes.length - 1 };
                    } else {
                        this.editor.activePath.nodes.unshift(newNode);
                        this.draggingItem = { type: 'anchor', index: 0 };
                    }
                }
            }
        } else {
            // Continue path
            const startNode = this.editor.activePath.nodes[0];
            const distToStart = Geometry.getDistance({ x, y }, { x: startNode.x, y: startNode.y });

            // Snap radius: 25px (default) or 100px (Alt)
            const snapRadius = e.altKey ? 100 : 25;

            if (this.editor.activePath.nodes.length > 2 && distToStart <= snapRadius) {
                // Close path
                this.editor.activePath.closed = true;
                this.editor.activePath = null;
                this.editor.previewPoint = null;
            } else {

                // Add new node
                const newNode = new PathNode(x, y);

                if (this.continuingFromEnd) {
                    this.editor.activePath.nodes.push(newNode);
                    this.draggingItem = { type: 'anchor', index: this.editor.activePath.nodes.length - 1 };
                } else {
                    this.editor.activePath.nodes.unshift(newNode);
                    this.draggingItem = { type: 'anchor', index: 0 };
                }
            }
            this.editor.render();
        }
    }

    onMouseMove(e: MouseEvent) {
        let { x, y } = this.editor.getMousePos(e);

        // Only show preview and crosshair when actively drawing
        if (this.editor.activePath) {
            // SHIFT CONSTRAINING: Constrain to horizontal, vertical, or 45° angles
            if (e.shiftKey && this.editor.activePath.nodes.length > 0) {
                // Determine reference node based on continuation direction
                let lastNode;
                if (this.continuingFromEnd) {
                    lastNode = this.editor.activePath.nodes[this.editor.activePath.nodes.length - 1];
                } else {
                    lastNode = this.editor.activePath.nodes[0];
                }
                const dx = x - lastNode.x;
                const dy = y - lastNode.y;
                const angle = Math.atan2(dy, dx) * (180 / Math.PI);

                // Snap to nearest 45° angle
                const snapAngle = Math.round(angle / 45) * 45;
                const distance = Math.sqrt(dx * dx + dy * dy);

                x = lastNode.x + distance * Math.cos(snapAngle * Math.PI / 180);
                y = lastNode.y + distance * Math.sin(snapAngle * Math.PI / 180);
            }

            this.editor.canvas.style.cursor = 'crosshair';
            this.editor.previewPoint = { x, y };

            if (this.draggingItem) {
                const node = this.editor.activePath.nodes[this.draggingItem.index];
                node.cpOut.x = x;
                node.cpOut.y = y;
                node.cpIn.x = node.x - (x - node.x);
                node.cpIn.y = node.y - (y - node.y);
            }

            // Set preview origin for renderer if prepending
            if (!this.continuingFromEnd && this.editor.activePath.nodes.length > 0) {
                const firstNode = this.editor.activePath.nodes[0];
                this.editor.previewOrigin = { x: firstNode.x, y: firstNode.y };
            } else {
                this.editor.previewOrigin = null;
            }

            this.editor.render();
        } else {
            // Reset cursor when not drawing
            this.editor.canvas.style.cursor = 'default';
        }
    }

    onMouseUp(e: MouseEvent) {
        this.draggingItem = null;
    }

    onContextMenu(e: MouseEvent) {
        e.preventDefault();

        // Finish current path
        if (this.editor.activePath) {

            if (this.editor.activePath.nodes.length < 2) {
                // Remove if too short (single point) check? 
                // Or just keep logic:
                // Commit path
                const path = this.editor.activePath;
                // Ideally create shape command

                // If the path has only 1 node, it might not be visible or useful.
                if (path.nodes.length === 1) {
                    // abort
                    this.editor.activePath = null;
                    this.editor.previewPoint = null;
                    this.editor.render();
                    return;
                }

                // If last node is temporary (preview point might be added as node?), 
                // PenTool logic usually handles preview separately.

                // Just push command
                const cmd = new CreateShapeCommand(path);
                this.editor.history.execute(cmd);

            } else {
                // Regular commit
                const cmd = new CreateShapeCommand(this.editor.activePath);
                this.editor.history.execute(cmd);
            }

            this.editor.activePath = null;
            this.editor.previewPoint = null;
            this.editor.render();
        }
    }

    onKeyDown(e: KeyboardEvent) {
        if (this.editor.activePath) {
            if (e.key === 'Enter') {
                // Command Pattern: Commit the finished path
                const currentShapes = this.editor.shapes;
                this.editor.shapes = currentShapes.filter((s: any) => s.id !== this.editor.activePath.id);

                const command = new CreateShapeCommand(this.editor.activePath);
                this.editor.history.execute(command);

                this.editor.activePath = null;
                this.editor.previewPoint = null;
                this.editor.render();
            } else if (e.key === 'Escape') {
                const index = this.editor.shapes.indexOf(this.editor.activePath);
                if (index > -1) {
                    this.editor.shapes.splice(index, 1);
                }
                this.editor.activePath = null;
                this.editor.previewPoint = null;
                this.editor.selectedShapes = [];
                this.editor.render();
            }
        }
    }

    onDeactivate(): void {
        this.editor.activePath = null;
        this.editor.previewPoint = null;
        this.editor.previewOrigin = null;
        this.editor.render();
    }

    onActivate(): void {
        this.editor.canvas.style.cursor = 'default';
        this.editor.activePath = null; // Ensure fresh start
        this.editor.previewOrigin = null;
        this.draggingItem = null;
    }
}
