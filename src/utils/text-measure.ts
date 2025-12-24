export class TextMeasurer {
    private static canvas: HTMLCanvasElement | null = null;
    private static ctx: CanvasRenderingContext2D | null = null;

    static measure(
        text: string,
        fontSize: number,
        fontFamily: string,
        fontWeight: string = 'normal',
        fontStyle: string = 'normal'
    ): number {
        if (!this.canvas) {
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d');
        }

        if (this.ctx) {
            this.ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
            const metrics = this.ctx.measureText(text);
            return metrics.width;
        }

        // Fallback if context is not available
        return text.length * (fontSize * 0.6);
    }
}
