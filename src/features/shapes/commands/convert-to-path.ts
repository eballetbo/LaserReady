import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { PathShape } from '../models/path';
import { GroupShape } from '../models/group';
import { PathNode } from '../models/node';
import { notify } from '../../ui/Toast';
import { TextObject } from '../models/text';
import opentype from 'opentype.js';

import { IShape } from '../types';

const FONT_URL = 'https://unpkg.com/roboto-font@0.1.0/fonts/Roboto/roboto-regular-webfont.ttf';

let cachedFont: opentype.Font | null = null;

/**
 * Preloads the font used for text-to-path conversion.
 * Call this early so that ConvertToPathCommand.execute() is synchronous.
 */
export async function preloadConversionFont(): Promise<opentype.Font | null> {
    if (cachedFont) return cachedFont;
    try {
        const font = await opentype.load(FONT_URL);
        cachedFont = font;
        return font;
    } catch {
        notify('Failed to load font for text conversion. Please check your internet connection.', 'error');
        return null;
    }
}

export class ConvertToPathCommand implements Command {
    private textObject: TextObject;
    private pathShape: IShape | null;
    private font: opentype.Font;

    constructor(textObject: TextObject, font: opentype.Font) {
        this.textObject = textObject;
        this.pathShape = null;
        this.font = font;
    }

    execute(): void {
        if (this.pathShape) {
            this.swap(this.textObject, this.pathShape);
            return;
        }
        this.generatePath();
    }

    private generatePath() {
        const path = this.font.getPath(
            this.textObject.text,
            this.textObject.x,
            this.textObject.y,
            this.textObject.fontSize
        );

        let lastX = 0;
        let lastY = 0;

        const shapes: PathShape[] = [];
        let currentNodes: PathNode[] = [];

        path.commands.forEach((cmd: opentype.PathCommand) => {
            switch (cmd.type) {
                case 'M':
                    if (currentNodes.length > 0) {
                        shapes.push(new PathShape(currentNodes, true, this.textObject.layerId));
                        currentNodes = [];
                    }
                    currentNodes.push(new PathNode(cmd.x, cmd.y));
                    lastX = cmd.x;
                    lastY = cmd.y;
                    break;

                case 'L':
                    currentNodes.push(new PathNode(cmd.x, cmd.y));
                    lastX = cmd.x;
                    lastY = cmd.y;
                    break;

                case 'C':
                    if (currentNodes.length > 0) {
                        const prev = currentNodes[currentNodes.length - 1];
                        prev.cpOut = { x: cmd.x1, y: cmd.y1 };
                    }

                    currentNodes.push(new PathNode(cmd.x, cmd.y, cmd.x2, cmd.y2));
                    lastX = cmd.x;
                    lastY = cmd.y;
                    break;

                case 'Q': {
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
                }

                case 'Z':
                    break;
            }
        });

        if (currentNodes.length > 0) {
            shapes.push(new PathShape(currentNodes, true, this.textObject.layerId));
        }

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

        finalShape.strokeColor = this.textObject.strokeColor;
        finalShape.strokeWidth = this.textObject.strokeWidth;
        finalShape.fillColor = this.textObject.fillColor;
        finalShape.layerId = this.textObject.layerId;

        this.pathShape = finalShape;
        this.swap(this.textObject, finalShape);
    }

    private swap(oldShape: IShape, newShape: IShape) {
        const { shapes, setShapes } = useStore.getState();

        const index = shapes.findIndex(s => s.id === oldShape.id);
        if (index === -1) return;

        const newShapes = [...shapes];
        newShapes[index] = newShape;
        setShapes(newShapes);

        useStore.getState().setSelectedShapes([newShape.id]);
    }

    undo(): void {
        if (this.pathShape) {
            this.swap(this.pathShape, this.textObject);
        }
    }
}
