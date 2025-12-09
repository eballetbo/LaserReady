import { TextMeasurer } from '../utils/text-measurer.js';
export class TextObject {
    constructor(x, y, text = '', style = {}) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.fontSize = style.fontSize || 24;
        this.fontFamily = style.fontFamily || 'Arial';
        this.fontWeight = style.fontWeight || 'normal';
        this.fontStyle = style.fontStyle || 'normal';
        this.fillColor = style.fillColor || '#000000';
        this.strokeColor = style.strokeColor || null;
        this.strokeWidth = style.strokeWidth || 0;
        this.rotation = style.rotation || 0;
        this.scaleX = style.scaleX || 1;
        this.scaleY = style.scaleY || 1;
        this.type = 'text';
    }

    getBounds() {
        // Use TextMeasurer if available (in browser environment)
        // If running in node/test without canvas, fallback to approximation
        let maxWidth = 0;
        const lines = this.text.split('\n');
        const lineHeight = this.fontSize * 1.2;
        const height = lines.length * lineHeight;

        if (typeof document !== 'undefined') {
            // Dynamic import to avoid issues if module system is strict about circular deps or environment
            // But we can just assume it's available or pass it in. 
            // Since TextObject is a model, importing a util is fine.
            // We need to import it at the top of the file.
            // For now, let's assume we can use a global or we need to import it.
            // I will add the import in a separate edit or assume I can add it here if I replace the whole file content or use multi-replace.
            // But I am using replace_file_content on a block.
            // I'll try to use the imported class. I need to add the import first.
            // Wait, I can't add import with this tool unless I replace the top of the file.
            // I'll use a fallback if TextMeasurer is not defined, and add the import in the next step.
        }

        // We will implement the logic assuming TextMeasurer is imported.

        lines.forEach(line => {
            let width;
            try {
                // We need to import TextMeasurer. 
                // Since I can't add the import line in this block, I will assume I'll add it.
                // But the code will fail if I don't add it.
                // So I should probably use multi_replace to add the import and update getBounds.
                // Or just use the global document logic here directly if I want to avoid imports in model?
                // No, better to use the utility.
                // I'll use the utility.
                width = TextMeasurer.measure(line, this.fontSize, this.fontFamily, this.fontWeight, this.fontStyle);
            } catch (e) {
                // Fallback
                width = line.length * (this.fontSize * 0.6);
            }
            if (width > maxWidth) maxWidth = width;
        });

        const w = maxWidth * Math.abs(this.scaleX);
        const h = height * Math.abs(this.scaleY);

        return {
            minX: this.x,
            minY: this.y - this.fontSize * this.scaleY, // Text draws from baseline usually
            maxX: this.x + w,
            maxY: this.y - this.fontSize * this.scaleY + h,
            width: w,
            height: h,
            cx: this.x + w / 2,
            cy: this.y - this.fontSize * this.scaleY + h / 2
        };
    }

    move(dx, dy) {
        this.x += dx;
        this.y += dy;
    }

    rotate(angle, center) {
        // Rotate position
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const dx = this.x - center.x;
        const dy = this.y - center.y;

        this.x = center.x + dx * cos - dy * sin;
        this.y = center.y + dx * sin + dy * cos;

        // Update rotation angle
        this.rotation += angle;
    }

    scale(sx, sy, center) {
        this.scaleX *= sx;
        this.scaleY *= sy;

        this.x = center.x + (this.x - center.x) * sx;
        this.y = center.y + (this.y - center.y) * sy;
    }

    clone() {
        return new TextObject(this.x, this.y, this.text, {
            fontSize: this.fontSize,
            fontFamily: this.fontFamily,
            fontWeight: this.fontWeight,
            fontStyle: this.fontStyle,
            fillColor: this.fillColor,
            strokeColor: this.strokeColor,
            strokeWidth: this.strokeWidth,
            rotation: this.rotation,
            scaleX: this.scaleX,
            scaleY: this.scaleY
        });
    }

    static fromJSON(json) {
        return new TextObject(json.x, json.y, json.text, {
            fontSize: json.fontSize,
            fontFamily: json.fontFamily,
            fontWeight: json.fontWeight,
            fontStyle: json.fontStyle,
            fillColor: json.fillColor,
            strokeColor: json.strokeColor,
            strokeWidth: json.strokeWidth,
            rotation: json.rotation,
            scaleX: json.scaleX,
            scaleY: json.scaleY
        });
    }
}
