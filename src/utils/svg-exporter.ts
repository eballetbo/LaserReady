import paper from 'paper';
import { BooleanOperations } from '../core/math/boolean';
import { PathShape } from '../features/shapes/path-shape';

// Initialize a headless PaperScope for SVG exporting
const scope = new paper.PaperScope();
scope.setup(new paper.Size(1000, 1000));

export const exportToSVG = (shapes: PathShape[], width: number, height: number): string => {
    // Clear project
    scope.project.clear();
    scope.view.viewSize = new paper.Size(width, height);

    // Convert shapes to paper items
    shapes.forEach(shape => {
        const path = BooleanOperations.toPaperPath(shape) as paper.PathItem;

        // Apply styles from params (imported SVGs) or layer defaults?
        // PathShape doesn't store color directly anymore, it uses layers.
        // But for export, we might strictly rely on params if they exist (legacy import) or we need access to Layers to get colors.
        // Since `toPaperPath` purely converts geometry, we set style here.
        // Assuming params might hold style for imported items:
        const style = shape.params as any; // Cast to access potential style props

        if (style?.strokeColor) path.strokeColor = new paper.Color(style.strokeColor);
        if (style?.strokeWidth) path.strokeWidth = style.strokeWidth;
        if (style?.fillColor) path.fillColor = new paper.Color(style.fillColor);

        // Default styles if not set (for visibility in export)
        if (!path.strokeColor && !path.fillColor) {
            path.strokeColor = new paper.Color('black');
            path.strokeWidth = 1;
        }
    });

    // Export SVG
    const svgString = scope.project.exportSVG({
        asString: true,
        bounds: 'content' // or 'view'
    }) as string;

    return svgString;
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
