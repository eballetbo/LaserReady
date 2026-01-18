/**
 * Standard DPI for Web/CSS.
 * 1 inch = 96 pixels.
 */
export const DPI = 96;

export const SVGAttributeParser = {
    /**
     * Converts a length string (e.g., "10mm", "1in", "20pt") to pixels (96 DPI).
     * If no unit is specified, it treats it as pixels.
     * 
     * @param valueStr The string value from SVG attribute (e.g. "100", "25.4mm")
     * @returns value in pixels (number) or 0 if invalid
     */
    parseUnitToPixels(valueStr: string | null | undefined): number {
        if (!valueStr) return 0;

        const trimmed = valueStr.trim().toLowerCase();
        // Match number part and unit part
        // Regex handles decimals, negative numbers (though length shouldn't be negative)
        const match = trimmed.match(/^(-?[\d.]+)([a-z%]*)$/);

        if (!match) return 0;

        const value = parseFloat(match[1]);
        const unit = match[2];

        if (isNaN(value)) return 0;

        switch (unit) {
            case 'in':
                return value * DPI;
            case 'mm':
                return (value / 25.4) * DPI;
            case 'cm':
                return (value / 2.54) * DPI;
            case 'pt':
                // 1pt = 1/72 inch. 
                // In 96 DPI system: 1pt = 96/72 = 1.3333px
                return value * (DPI / 72);
            case 'pc':
                // 1pc = 12pt = 12 * (96/72) = 16px
                return value * 16;
            case 'px':
            case '':
                return value;
            case '%':
                // Percentages are relative to viewbox or parent, 
                // handling them requires context we might not have here.
                // For top-level width/height, often treated as pixels if parent unknown,
                // but strictly 100% means "fill container".
                // Returning raw value as fallback.
                return value;
            default:
                console.warn(`Unknown SVG unit: ${unit}, treating as pixels.`);
                return value;
        }
    },

    /**
     * Extracts basic dimensions and viewBox from an SVG string tag.
     * Uses regex to avoid full DOM parsing overhead for simple checks.
     */
    parseRootAttributes(svgString: string) {
        // Extract the opening <svg ... > tag
        const tagMatch = svgString.match(/<svg\s+([^>]+)>/i);
        if (!tagMatch) return null;

        const attrsString = tagMatch[1];

        // Helper to get attr value
        const getAttr = (name: string) => {
            // Match name="value" or name='value'
            const regex = new RegExp(`${name}=["']([^"']+)["']`, 'i');
            const match = attrsString.match(regex);
            return match ? match[1] : null;
        };

        const widthStr = getAttr('width');
        const heightStr = getAttr('height');
        const viewBoxStr = getAttr('viewBox');

        let viewBox = null;
        if (viewBoxStr) {
            const parts = viewBoxStr.split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));
            if (parts.length === 4) {
                viewBox = { x: parts[0], y: parts[1], w: parts[2], h: parts[3] };
            }
        }

        return {
            widthOriginal: widthStr,
            heightOriginal: heightStr,
            widthPx: widthStr ? this.parseUnitToPixels(widthStr) : null,
            heightPx: heightStr ? this.parseUnitToPixels(heightStr) : null,
            viewBox,
            viewBoxStr
        };
    }
};
