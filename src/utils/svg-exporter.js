import paper from 'paper';
import { BooleanOperations } from '../math/boolean.js';

// Initialize a headless PaperScope for SVG exporting
const scope = new paper.PaperScope();
scope.setup(new paper.Size(1000, 1000));

export const exportToSVG = (shapes, width, height) => {
    // Clear project
    scope.project.clear();
    scope.view.viewSize = new paper.Size(width, height);

    // Convert shapes to paper items
    shapes.forEach(shape => {
        const path = BooleanOperations.toPaperPath(shape);

        // Apply styles
        if (shape.strokeColor) path.strokeColor = shape.strokeColor;
        if (shape.strokeWidth) path.strokeWidth = shape.strokeWidth;
        if (shape.fillColor) path.fillColor = shape.fillColor;

        // Default styles if not set (for visibility in export)
        if (!path.strokeColor && !path.fillColor) {
            path.strokeColor = 'black';
            path.strokeWidth = 1;
        }
    });

    // Export SVG
    const svgString = scope.project.exportSVG({
        asString: true,
        bounds: 'content' // or 'view'
    });

    return svgString;
};

export const downloadSVG = (svgString, filename = 'design.svg') => {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
