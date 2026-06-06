import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { PathShape } from '../models/path';
import { GroupShape } from '../models/group';
import { PathNode } from '../models/node';
import { notify } from '../../ui/Toast';
import { TextObject } from '../models/text';
import opentype from 'opentype.js';

import { IShape } from '../types';

const FALLBACK_FONT_PATH = '/fonts/Roboto.ttf';

const fontCache = new Map<string, opentype.Font>();

const LOCAL_FONT_MAP: Record<string, string> = {
    'Roboto': '/fonts/Roboto.ttf',
    'Open Sans': '/fonts/OpenSans.ttf',
    'Lato': '/fonts/Lato.ttf',
    'Montserrat': '/fonts/Montserrat.ttf',
    'Poppins': '/fonts/Poppins.ttf',
    'Raleway': '/fonts/Raleway.ttf',
    'Nunito': '/fonts/Nunito.ttf',
    'Ubuntu': '/fonts/Ubuntu.ttf',
    'Noto Sans': '/fonts/NotoSans.ttf',
    'Oswald': '/fonts/Oswald.ttf',
    'Bebas Neue': '/fonts/BebasNeue.ttf',
    'Righteous': '/fonts/Righteous.ttf',
    'Black Ops One': '/fonts/BlackOpsOne.ttf',
    'Permanent Marker': '/fonts/PermanentMarker.ttf',
    'Bungee Shade': '/fonts/BungeeShade.ttf',
    'Playfair Display': '/fonts/PlayfairDisplay.ttf',
    'Merriweather': '/fonts/Merriweather.ttf',
    'Dancing Script': '/fonts/DancingScript.ttf',
    'Pacifico': '/fonts/Pacifico.ttf',
    'Great Vibes': '/fonts/GreatVibes.ttf',
    'Sacramento': '/fonts/Sacramento.ttf',
    'Lobster': '/fonts/Lobster.ttf',
    'PT Serif': '/fonts/PTSerif.ttf',
    'Bitter': '/fonts/Bitter.ttf',
    'Libre Baskerville': '/fonts/LibreBaskerville.ttf',
    'Roboto Mono': '/fonts/RobotoMono.ttf',
    'Source Code Pro': '/fonts/SourceCodePro.ttf',
    'Courier Prime': '/fonts/CourierPrime.ttf',
    'Verdana': '/fonts/Roboto.ttf',
};

/**
 * Loads a font for path conversion/weld operations.
 * Uses cached instances when available.
 */
export async function loadFontForConversion(fontFamily: string): Promise<opentype.Font | null> {
    if (fontCache.has(fontFamily)) return fontCache.get(fontFamily)!;

    const url = LOCAL_FONT_MAP[fontFamily] || FALLBACK_FONT_PATH;
    try {
        const font = await opentype.load(url);
        fontCache.set(fontFamily, font);
        return font;
    } catch {
        notify(`Failed to load font "${fontFamily}" for conversion. Using fallback.`, 'error');
        if (fontFamily !== 'Roboto') {
            return loadFontForConversion('Roboto');
        }
        return null;
    }
}

/**
 * @deprecated Use loadFontForConversion instead
 */
export async function preloadConversionFont(): Promise<opentype.Font | null> {
    return loadFontForConversion('Roboto');
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

/**
 * Converts text characters to individual paths, then performs boolean union
 * to merge overlapping outlines into a single welded path.
 */
export class WeldTextCommand implements Command {
    private textObject: TextObject;
    private resultShape: IShape | null = null;
    private font: opentype.Font;

    constructor(textObject: TextObject, font: opentype.Font) {
        this.textObject = textObject;
        this.font = font;
    }

    execute(): void {
        if (this.resultShape) {
            this.swap(this.textObject, this.resultShape);
            return;
        }
        this.performWeld();
    }

    private performWeld(): void {
        const { BooleanOperations } = require('../../../core/math/boolean');

        const text = this.textObject.getDisplayText();
        const path = this.font.getPath(
            text,
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
                        const prev = currentNodes[currentNodes.length - 1]!;
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
                        const prev = currentNodes[currentNodes.length - 1]!;
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

        if (shapes.length < 2) {
            notify('Text has no overlapping outlines to weld.', 'info');
            if (shapes.length === 1) {
                this.resultShape = shapes[0]!;
                this.resultShape.layerId = this.textObject.layerId;
                this.swap(this.textObject, this.resultShape);
            }
            return;
        }

        const welded = BooleanOperations.unite(shapes) as PathShape[] | null;
        if (!welded || welded.length === 0) {
            notify('Weld produced no result — characters may not overlap.', 'info');
            return;
        }

        let finalShape: IShape;
        if (welded.length === 1) {
            finalShape = welded[0]!;
        } else {
            finalShape = new GroupShape(welded);
        }

        finalShape.layerId = this.textObject.layerId;
        this.resultShape = finalShape;
        this.swap(this.textObject, finalShape);
    }

    private swap(oldShape: IShape, newShape: IShape): void {
        const { shapes, setShapes } = useStore.getState();
        const index = shapes.findIndex(s => s.id === oldShape.id);
        if (index === -1) return;
        const newShapes = [...shapes];
        newShapes[index] = newShape;
        setShapes(newShapes);
        useStore.getState().setSelectedShapes([newShape.id]);
    }

    undo(): void {
        if (this.resultShape) {
            this.swap(this.resultShape, this.textObject);
        }
    }
}
