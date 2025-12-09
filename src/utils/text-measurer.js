export class TextMeasurer {
    static canvas = null;
    static ctx = null;

    static measure(text, fontSize, fontFamily, fontWeight = 'normal', fontStyle = 'normal') {
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d');
        }

        this.ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
        const metrics = this.ctx.measureText(text);
        return metrics.width;
    }
}
