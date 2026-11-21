import paper from 'paper';
import opentype from 'opentype.js';
import { PIXELS_PER_MM } from '../../config/constants';
import { LASER_MODES } from '../../config/laser-modes';
import { PathNode } from '../../features/shapes/models/node';
import { IShape } from '../../features/shapes/types';
import { LaserLayer } from '../../types/layer';

const FALLBACK_FONT_PATH = '/fonts/Roboto.ttf';
const exportFontCache = new Map<string, opentype.Font>();

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

async function loadFontForExport(fontFamily: string): Promise<opentype.Font | null> {
    if (exportFontCache.has(fontFamily)) {
        return exportFontCache.get(fontFamily)!;
    }

    const url = LOCAL_FONT_MAP[fontFamily] || FALLBACK_FONT_PATH;
    try {
        const font = await opentype.load(url);
        exportFontCache.set(fontFamily, font);
        return font;
    } catch {
        if (fontFamily !== 'Roboto') {
            return loadFontForExport('Roboto');
        }
        return null;
    }
}

function collectFontFamilies(shapes: IShape[], families: Set<string>): void {
    for (const shape of shapes) {
        if (shape.type === 'group' && shape.children) {
            collectFontFamilies(shape.children, families);
        } else if (shape.type === 'text') {
            const t = shape as unknown as TextShapeView;
            families.add(t.fontFamily || 'Roboto');
        }
    }
}

interface TextShapeView {
    x?: number;
    y?: number;
    text?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string;
    fontStyle?: string;
    fillColor?: string;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
}

// Initialize a headless PaperScope for SVG exporting
const scope = new paper.PaperScope();
scope.setup(new paper.Size(1000, 1000));

function shapeToPaperPath(shape: IShape): paper.Path | null {
    if (!shape.nodes || shape.nodes.length === 0) return null;

    const path = new scope.Path({ closed: shape.closed });

    shape.nodes.forEach((node: PathNode | { x: number; y: number; cpIn?: { x: number; y: number }; cpOut?: { x: number; y: number } }) => {
        const point = new scope.Point(node.x, node.y);
        const cpIn = node.cpIn ?? { x: node.x, y: node.y };
        const cpOut = node.cpOut ?? { x: node.x, y: node.y };
        const handleIn = new scope.Point(cpIn.x - node.x, cpIn.y - node.y);
        const handleOut = new scope.Point(cpOut.x - node.x, cpOut.y - node.y);

        path.add(new scope.Segment(point, handleIn, handleOut));
    });

    return path;
}

export const exportToSVG = (
    shapes: IShape[],
    width: number,
    height: number,
    layers?: LaserLayer[],
    fonts?: Map<string, opentype.Font>
): string => {
    const layerMap = new Map<string, LaserLayer>();
    if (layers) layers.forEach(l => layerMap.set(l.id, l));

    // Clear project and ensure an active layer exists
    scope.activate();
    scope.project.clear();
    new scope.Layer();
    scope.view.viewSize = new paper.Size(width, height);

    const addShapeToProject = (shape: IShape): void => {
        if (shape.type === 'group') {
            if (shape.children) {
                shape.children.forEach(child => addShapeToProject(child));
            }
            return;
        }

        let item: paper.Item | null = null;

        if (shape.type === 'text') {
            const t = shape as unknown as TextShapeView;
            const font = fonts?.get(t.fontFamily || 'Roboto');
            if (font) {
                const pathData = font.getPath(t.text ?? '', t.x ?? 0, t.y ?? 0, t.fontSize ?? 24).toPathData(4);
                if (pathData) {
                    item = new scope.CompoundPath(pathData);
                    if (t.rotation) item.rotate(t.rotation);
                    if (t.scaleX && t.scaleY) item.scale(t.scaleX, t.scaleY);
                    if (!shape.fillColor) {
                        item.fillColor = new paper.Color(t.fillColor || 'black');
                    }
                }
            } else {
                const textItem = new scope.PointText({
                    point: new paper.Point(t.x ?? 0, t.y ?? 0),
                    content: t.text ?? '',
                    fontFamily: t.fontFamily,
                    fontSize: t.fontSize,
                    fontWeight: t.fontWeight,
                    fontStyle: t.fontStyle,
                    fillColor: t.fillColor || 'black'
                });
                if (t.rotation) textItem.rotate(t.rotation);
                if (t.scaleX && t.scaleY) textItem.scale(t.scaleX, t.scaleY);
                item = textItem;
            }
        } else if (shape.nodes) {
            item = shapeToPaperPath(shape);
        }

        if (!item) return;

        if (shape.strokeColor) {
            item.strokeColor = new paper.Color(shape.strokeColor);
        } else if (shape.layerId && layerMap.has(shape.layerId)) {
            const layer = layerMap.get(shape.layerId)!;
            const modeColor = LASER_MODES[layer.mode]?.color;
            if (modeColor) item.strokeColor = new paper.Color(modeColor);
        }

        if (shape.strokeWidth) item.strokeWidth = shape.strokeWidth;
        if (shape.fillColor) item.fillColor = new paper.Color(shape.fillColor);

        if (!item.strokeColor && !item.fillColor && shape.type !== 'text') {
            item.strokeColor = new paper.Color('black');
            item.strokeWidth = 1;
        }
    };

    shapes.forEach(addShapeToProject);

    // Calculate physical dimensions in Millimeters
    const widthMM = (width / PIXELS_PER_MM).toFixed(2);
    const heightMM = (height / PIXELS_PER_MM).toFixed(2);

    // Export SVG as DOM Element
    const svg = scope.project.exportSVG({
        asString: false,
        bounds: 'view' // preserve the canvas structure (0,0 to width,height)
    }) as SVGElement;

    // Set physical units
    svg.setAttribute('width', `${widthMM}mm`);
    svg.setAttribute('height', `${heightMM}mm`);

    // Explicitly set viewBox to pixels to ensure internal coordinates map correctly
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // Serialize to string
    return new XMLSerializer().serializeToString(svg);
};

export const exportToSVGAsync = async (
    shapes: IShape[],
    width: number,
    height: number,
    layers?: LaserLayer[]
): Promise<string> => {
    const families = new Set<string>();
    collectFontFamilies(shapes, families);

    const fonts = new Map<string, opentype.Font>();
    await Promise.all(
        Array.from(families).map(async (family) => {
            const font = await loadFontForExport(family);
            if (font) fonts.set(family, font);
        })
    );

    return exportToSVG(shapes, width, height, layers, fonts);
};

export const downloadSVG = (svgString: string, filename: string = 'design.svg'): void => {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
