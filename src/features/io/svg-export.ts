import paper from 'paper';
import { BooleanOperations } from '../../core/math/boolean';
import { PIXELS_PER_MM } from '../../config/constants';
import { PathShape } from '../../features/shapes/models/path';
import { IShape } from '../../features/shapes/types';

// Initialize a headless PaperScope for SVG exporting
const scope = new paper.PaperScope();
scope.setup(new paper.Size(1000, 1000));

export const exportToSVG = (shapes: IShape[], width: number, height: number): string => {
    // Clear project
    scope.project.clear();
    scope.view.viewSize = new paper.Size(width, height);

    // Convert shapes to paper items
    shapes.forEach(shape => {
        let item: paper.Item | null = null;

        if (shape.type === 'text') {
            // Vectorize Text
            const textShape = shape as any; // Cast to access text props

            // Create PointText in headless scope
            const textItem = new scope.PointText({
                point: new paper.Point(textShape.x, textShape.y),
                content: textShape.text,
                fontFamily: textShape.fontFamily,
                fontSize: textShape.fontSize,
                fontWeight: textShape.fontWeight,
                fontStyle: textShape.fontStyle,
                fillColor: textShape.fillColor || 'black' // Text usually has fill
            });

            // Apply transforms
            if (textShape.rotation) textItem.rotate(textShape.rotation);
            if (textShape.scaleX && textShape.scaleY) textItem.scale(textShape.scaleX, textShape.scaleY);

            // Convert to Vector Path
            // toPath() returns the new PathItem and removes the text item if successful? 
            // Paper.js docs: "Converts the text item into a Path item..."
            // It might return Path or CompoundPath
            item = (textItem as any).toPath();
            textItem.remove(); // Cleanup original text if toPath didn't replace it (it usually returns a new item)

        } else {
            // Assume PathShape
            item = BooleanOperations.toPaperPath(shape as PathShape) as paper.PathItem;
        }

        if (!item) return;

        // Apply styles
        const style = shape.params as any;

        if (style?.strokeColor) item.strokeColor = new paper.Color(style.strokeColor);
        if (style?.strokeWidth) item.strokeWidth = style.strokeWidth;
        if (style?.fillColor) item.fillColor = new paper.Color(style.fillColor);

        // Default styles for paths if not set
        if (!item.strokeColor && !item.fillColor && shape.type !== 'text') {
            item.strokeColor = new paper.Color('black');
            item.strokeWidth = 1;
        }
    });

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
