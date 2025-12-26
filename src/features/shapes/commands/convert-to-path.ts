import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { PathShape } from '../models/path';
import { GroupShape } from '../models/group';
import { PathNode } from '../models/node';
import { TextObject } from '../models/text';
import opentype from 'opentype.js';

import { IShape } from '../types';

const FONT_URL = 'https://unpkg.com/roboto-font@0.1.0/fonts/Roboto/roboto-regular-webfont.ttf';

export class ConvertToPathCommand implements Command {
    private textObject: TextObject;
    private pathShape: IShape | null;
    private font: opentype.Font | null;

    constructor(textObject: TextObject) {
        this.textObject = textObject;
        this.pathShape = null;
        this.font = null;
    }

    execute(): void {
        // If we already converted (redo), just swap
        if (this.pathShape) {
            this.swap(this.textObject, this.pathShape);
            return;
        }

        console.log(`[ConvertToPath] Loading font from ${FONT_URL}...`);

        // First time: Load font and convert
        opentype.load(FONT_URL, (err: any, font: opentype.Font | undefined) => {
            if (err || !font) {
                console.error('[ConvertToPath] Font could not be loaded:', err);
                alert('Failed to load font for text conversion. Please check your internet connection.');
                return;
            }
            console.log('[ConvertToPath] Font loaded successfully. Generating path...');
            this.font = font;
            this.generatePath();
        });
    }

    private generatePath() {
        if (!this.font) return;

        const path = this.font.getPath(
            this.textObject.text,
            this.textObject.x,
            this.textObject.y,
            this.textObject.fontSize
        );

        // const nodes: PathNode[] = []; // Unused
        // let startX = 0; // Unused
        // let startY = 0; // Unused
        let lastX = 0;
        let lastY = 0;

        // Convert opentype commands to PathNodes
        // Note: This is a simplified conversion. 
        // Real conversion needs to handle multiple sub-paths (M commands) if text has holes or multiple letters.
        // For MVP, we'll try to create one shape, or maybe a Group of shapes?
        // LaserReady's PathShape supports one list of nodes. If strict MoveTo happens, it implies a break.
        // Current PathShape might not support multiple sub-paths (holes).
        // If strict, we might need a Group of PathShapes.
        // Let's assume we create a Group if there are multiple moves, or just connect them if the user just wants the outline.
        // BETTER: Create a single PathShape but our PathShape logic likely draws a continuous line. 
        // If opentype has multiple 'M', it means multiple subpaths.
        // Let's map it to a GROUP of PathShapes for safety (one for each letter/part).

        // Actually, looking at PathShape, it takes `nodes`. It doesn't seem to support multiple subpaths inherently unless we use a specific "close" or "move" flag on nodes.
        // The `PathNode` class doesn't have a "type" (move/line/curve). It implies a continuous bezier chain.
        // So we MUST return a GroupShape if there are multiple disjoint parts (like "i" dot, or multiple letters).

        // Wait, `GroupShape` is what we want.

        const shapes: PathShape[] = [];
        let currentNodes: PathNode[] = [];

        path.commands.forEach((cmd: opentype.PathCommand) => {
            switch (cmd.type) {
                case 'M': // Move To
                    if (currentNodes.length > 0) {
                        // Finish previous path
                        shapes.push(new PathShape(currentNodes, true, this.textObject.layerId));
                        currentNodes = [];
                    }
                    // startX = cmd.x;
                    // startY = cmd.y;
                    // Start new path with a node
                    currentNodes.push(new PathNode(cmd.x, cmd.y));
                    lastX = cmd.x;
                    lastY = cmd.y;
                    break;

                case 'L': // Line To
                    // Previous node's cpOut is it's position (linear)
                    // New node's cpIn is it's position (linear)
                    currentNodes.push(new PathNode(cmd.x, cmd.y));
                    lastX = cmd.x;
                    lastY = cmd.y;
                    break;

                case 'C': // Cubic Bezier
                    // cmd.x1, y1 is cpOut of PREVIOUS node
                    // cmd.x2, y2 is cpIn of NEW node
                    // cmd.x, y is position of NEW node

                    if (currentNodes.length > 0) {
                        const prev = currentNodes[currentNodes.length - 1];
                        prev.cpOut = { x: cmd.x1, y: cmd.y1 };
                    }

                    const newNode = new PathNode(cmd.x, cmd.y, cmd.x2, cmd.y2);
                    currentNodes.push(newNode);
                    lastX = cmd.x;
                    lastY = cmd.y;
                    break;

                case 'Q': // Quadratic Bezier
                    // Convert Quad to Cubic
                    // CP1 = P0 + 2/3 (Q1 - P0)
                    // CP2 = P3 + 2/3 (Q1 - P3)
                    const q1x = cmd.x1; const q1y = cmd.y1;
                    const p0x = lastX; const p0y = lastY;
                    const p3x = cmd.x; const p3y = cmd.y;

                    const c1x = p0x + (2 / 3) * (q1x - p0x);
                    const c1y = p0y + (2 / 3) * (q1y - p0y);
                    const c2x = p3x + (2 / 3) * (q1x - p3x);
                    const c2y = p3y + (2 / 3) * (q1y - p3y);

                    if (currentNodes.length > 0) {
                        const prev = currentNodes[currentNodes.length - 1];
                        prev.cpOut = { x: c1x, y: c1y };
                    }

                    currentNodes.push(new PathNode(p3x, p3y, c2x, c2y));
                    lastX = p3x;
                    lastY = p3y;
                    break;

                case 'Z': // Close Path
                    if (currentNodes.length > 0) {
                        // Usually implies connecting back to start. 
                        // Our PathShape 'closed' property handles the rendering loop, 
                        // but we might need to ensure the control points match up if it was a curve.
                        // For now, just mark closed.
                    }
                    break;
            }
        });

        // Push remaining
        if (currentNodes.length > 0) {
            shapes.push(new PathShape(currentNodes, true, this.textObject.layerId));
        }

        // Create the final object. If multiple shapes, group them. If one, just use it.
        // Wait, if it is a Group, I need GroupShape.
        // LaserReady has a 'group' type but does it have a class?
        // I should look at `src/features/shapes/models/group.ts`.

        this.handleShapesGenerated(shapes);
    }

    private handleShapesGenerated(shapes: PathShape[]) {
        if (shapes.length === 0) return;

        let finalShape: IShape;

        if (shapes.length === 1) {
            finalShape = shapes[0];
        } else {
            finalShape = new GroupShape(shapes);
        }

        // Copy style to final shape (whether path or group)
        finalShape.strokeColor = this.textObject.strokeColor;
        finalShape.strokeWidth = this.textObject.strokeWidth;
        finalShape.fillColor = this.textObject.fillColor;
        finalShape.layerId = this.textObject.layerId;

        this.pathShape = finalShape;
        this.swap(this.textObject, finalShape);
    }

    private swap(oldShape: IShape, newShape: IShape) {
        const { shapes, setShapes } = useStore.getState();

        // Replace in shapes array
        const index = shapes.findIndex(s => s.id === oldShape.id);
        if (index === -1) return;

        const newShapes = [...shapes];
        newShapes[index] = newShape;
        setShapes(newShapes);

        // Update selection if needed
        useStore.getState().setSelectedShapes([newShape.id]);
    }

    undo(): void {
        if (this.pathShape) {
            this.swap(this.pathShape, this.textObject);
        }
    }
}
