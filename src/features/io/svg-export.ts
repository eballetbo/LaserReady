import paper from 'paper';
import { BooleanOperations } from '../../core/math/boolean';
import { PIXELS_PER_MM } from '../../config/constants';
import { LASER_MODES } from '../../config/laser-modes';
import { PathShape } from '../../features/shapes/models/path';
import { IShape } from '../../features/shapes/types';
import { LaserLayer } from '../../types/layer';

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

export const exportToSVG = (shapes: IShape[], width: number, height: number, layers?: LaserLayer[]): string => {
    const layerMap = new Map<string, LaserLayer>();
    if (layers) layers.forEach(l => layerMap.set(l.id, l));

    // Clear project
    scope.project.clear();
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

            item = (textItem as unknown as { toPath(): paper.PathItem }).toPath();
            textItem.remove();
        } else if (shape.nodes) {
            item = BooleanOperations.toPaperPath(shape as PathShape) as paper.PathItem;
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
