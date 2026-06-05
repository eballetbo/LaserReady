import { BaseTool } from '../../../core/tools/base';
import { useStore } from '../../../store/useStore';
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
        // Only allow left click (button 0) to add nodes
        if (e.button !== 0) return;

        let { x, y } = this.editor.getMousePos(e);

        // SNAP LOGIC
        const snapResult = this.editor.snapManager.snapPoint({ x, y });
        if (snapResult.type !== 'none') {
            x = snapResult.point.x;
            y = snapResult.point.y;
        }

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
                    this.editor.render();
                    return;
                }
            }

            // Start new path (Ctrl held skips continuation search above)
            const startNode = new PathNode(x, y);
            this.editor.activePath = new PathShape([startNode], false, this.editor.activeLayerId);
            useStore.getState().addShapes([this.editor.activePath]);
            this.draggingItem = { type: 'anchor', index: 0 };
            this.continuingFromEnd = true;
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

        // SNAP LOGIC
        // Exclude current active path from snapping targets (don't snap to self while processing)
        // Actually, snapping to self (e.g. closing loop) is handled by PenTool logic below onMouseUp/Down.
        // But for "snap marker", we can let it snap to first node.
        const exclude: string[] = [];
        // If we are just moving, we might snap.

        const snapResult = this.editor.snapManager.snapPoint({ x, y }, exclude);
        if (snapResult.type !== 'none') {
            x = snapResult.point.x;
            y = snapResult.point.y;
        }

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

    onMouseUp(_e: MouseEvent) {
        this.draggingItem = null;
    }

    onContextMenu(e: MouseEvent) {
        e.preventDefault();

        // Finish current path
        if (this.editor.activePath) {

            // Remove preview shape from store before committing command
            // Remove preview shape from store before committing command
            useStore.getState().removeShapes([this.editor.activePath.id]);

            if (this.editor.activePath.nodes.length < 2) {
                // If single node, maybe just remove it? 
                // But original logic kept it. We'll stick to Commit.
                const cmd = new CreateShapeCommand(this.editor.activePath);
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
                useStore.getState().removeShapes([this.editor.activePath.id]);

                const command = new CreateShapeCommand(this.editor.activePath);
                this.editor.history.execute(command);

                this.editor.activePath = null;
                this.editor.previewPoint = null;
                this.editor.render();
            } else if (e.key === 'Escape') {
                useStore.getState().removeShapes([this.editor.activePath.id]);
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
