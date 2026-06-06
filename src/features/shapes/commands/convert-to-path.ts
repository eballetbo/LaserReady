import { Command } from '../../../core/commands/command';
import { useStore } from '../../../store/useStore';
import { PathShape } from '../models/path';
import { GroupShape } from '../models/group';
import { PathNode } from '../models/node';
import { notify } from '../../ui/Toast';
import { TextObject } from '../models/text';
import opentype from 'opentype.js';

import { IShape } from '../types';

const FALLBACK_FONT_URL = 'https://unpkg.com/roboto-font@0.1.0/fonts/Roboto/roboto-regular-webfont.ttf';

const fontCache = new Map<string, opentype.Font>();

const GOOGLE_FONT_URL_MAP: Record<string, string> = {
    'Roboto': 'https://fonts.gstatic.com/s/roboto/v47/KFOMCnqEu92Fr1ME7kSn66aGLdTylUAMQXC89YmC2DPNWubEbGmT.ttf',
    'Open Sans': 'https://fonts.gstatic.com/s/opensans/v40/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0B4gaVc.ttf',
    'Lato': 'https://fonts.gstatic.com/s/lato/v24/S6uyw4BMUTPHjx4wXg.ttf',
    'Montserrat': 'https://fonts.gstatic.com/s/montserrat/v29/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw5aXo.ttf',
    'Poppins': 'https://fonts.gstatic.com/s/poppins/v22/pxiEyp8kv8JHgFVrJJfecg.ttf',
    'Raleway': 'https://fonts.gstatic.com/s/raleway/v34/1Ptxg8zYS_SKggPN4iEgvnHyvveLxVvaorCIPrE.ttf',
    'Nunito': 'https://fonts.gstatic.com/s/nunito/v26/XRXI3I6Li01BKofiOc5wtlZ2di8HDLshRTY9jo7eTWk.ttf',
    'Ubuntu': 'https://fonts.gstatic.com/s/ubuntu/v20/4iCs6KVjbNBYlgo6eA.ttf',
    'Noto Sans': 'https://fonts.gstatic.com/s/notosans/v36/o-0bIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjc5a7du3mhPy0.ttf',
    'Oswald': 'https://fonts.gstatic.com/s/oswald/v53/TK3_WkUHHAIjg75cFRf3bXL8LICs1_FvsUZiYA.ttf',
    'Bebas Neue': 'https://fonts.gstatic.com/s/bebasneue/v14/JTUSjIg69CK48gW7PXooxW4.ttf',
    'Anton': 'https://fonts.gstatic.com/s/anton/v25/1Ptgg87GROyAm0K08i4gS7lu.ttf',
    'Righteous': 'https://fonts.gstatic.com/s/righteous/v17/1cXxaUPXBpj2rGoU7C9mj3uEicG0.ttf',
    'Bungee': 'https://fonts.gstatic.com/s/bungee/v14/N0bU2SZBIuF2PU_ECn50Kd_PmA.ttf',
    'Black Ops One': 'https://fonts.gstatic.com/s/blackopsone/v20/qWcsB6-ypo7xBdr6Xshe96H3WDzRtjkho4M.ttf',
    'Permanent Marker': 'https://fonts.gstatic.com/s/permanentmarker/v16/Fh4uPib9Iyv2ucM6pGQMWimMp004HaqIfrT5nlk.ttf',
    'Orbitron': 'https://fonts.gstatic.com/s/orbitron/v31/yMJMMIlzdpvBhQQL_SC3X9yhF25-T1nyGy6BoWgz.ttf',
    'Playfair Display': 'https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtM.ttf',
    'Merriweather': 'https://fonts.gstatic.com/s/merriweather/v30/u-4n0qyriQwlOrhSvowK_l521wRpX837pvjxPA4Y.ttf',
    'Dancing Script': 'https://fonts.gstatic.com/s/dancingscript/v25/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7BMSo3Sup6hNX6plRP.ttf',
    'Pacifico': 'https://fonts.gstatic.com/s/pacifico/v22/FwZY7-Qmy14u9lezJ96A4sijpFu_.ttf',
    'Great Vibes': 'https://fonts.gstatic.com/s/greatvibes/v19/RWmMoKWR9v4ksMlYITfQ7YLFpa5eSfmr.ttf',
    'Sacramento': 'https://fonts.gstatic.com/s/sacramento/v15/buEzpo6gcdjy0EiZMBUG4C0f-w.ttf',
    'Roboto Mono': 'https://fonts.gstatic.com/s/robotomono/v23/L0xuDF4xlVMF-BfR8bXMIhJHg45mwgGEFl0_3vq_ROW4.ttf',
};

/**
 * Loads a font for path conversion/weld operations.
 * Uses cached instances when available.
 */
export async function loadFontForConversion(fontFamily: string): Promise<opentype.Font | null> {
    if (fontCache.has(fontFamily)) return fontCache.get(fontFamily)!;

    const url = GOOGLE_FONT_URL_MAP[fontFamily] || FALLBACK_FONT_URL;
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
