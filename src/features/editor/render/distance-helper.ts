import {
    PIXELS_PER_MM,
    DISTANCE_LABEL_FONT_SIZE,
    DISTANCE_LABEL_COLOR,
    DISTANCE_LABEL_BG,
    DISTANCE_LABEL_BORDER,
    DISTANCE_ARROW_SIZE,
    DISTANCE_LINE_OFFSET,
    DISTANCE_LINE_COLOR
} from '../../../config/constants';

/**
 * Draw a dimension annotation between two points: a line with arrowheads
 * and a centered label pill showing the distance in mm.
 * All visual sizes are zoom-independent (constant on screen).
 * Coordinates are expected to be in world space with the context already
 * transformed (translate + scale) when operating inside the renderer,
 * or the caller must set up the transform before calling.
 */
export function drawDistanceHelper(
    ctx: CanvasRenderingContext2D,
    from: { x: number; y: number },
    to: { x: number; y: number },
    zoom: number
): void {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const lengthPx = Math.sqrt(dx * dx + dy * dy);
    if (lengthPx < 1 / zoom) return;

    const distMm = lengthPx / PIXELS_PER_MM;
    const label = distMm.toFixed(2);
    const angle = Math.atan2(dy, dx);

    const s = 1 / zoom;
    const offset = DISTANCE_LINE_OFFSET * s;
    const arrowSize = DISTANCE_ARROW_SIZE * s;
    const fontSize = DISTANCE_LABEL_FONT_SIZE * s;
    const pillPadX = 5 * s;
    const pillPadY = 2 * s;
    const pillRadius = 3 * s;
    const lineWidth = s;

    const nx = -Math.sin(angle);
    const ny = Math.cos(angle);

    const ox = nx * offset;
    const oy = ny * offset;

    const fromOff = { x: from.x + ox, y: from.y + oy };
    const toOff = { x: to.x + ox, y: to.y + oy };
    const mid = { x: (fromOff.x + toOff.x) / 2, y: (fromOff.y + toOff.y) / 2 };

    ctx.save();

    // Dimension line
    ctx.strokeStyle = DISTANCE_LINE_COLOR;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(fromOff.x, fromOff.y);
    ctx.lineTo(toOff.x, toOff.y);
    ctx.stroke();

    // Arrowheads
    ctx.fillStyle = DISTANCE_LINE_COLOR;
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(fromOff.x, fromOff.y);
    ctx.lineTo(
        fromOff.x - arrowSize * cosA + (arrowSize / 2.5) * sinA,
        fromOff.y - arrowSize * sinA - (arrowSize / 2.5) * cosA
    );
    ctx.lineTo(
        fromOff.x - arrowSize * cosA - (arrowSize / 2.5) * sinA,
        fromOff.y - arrowSize * sinA + (arrowSize / 2.5) * cosA
    );
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(toOff.x, toOff.y);
    ctx.lineTo(
        toOff.x + arrowSize * cosA + (arrowSize / 2.5) * sinA,
        toOff.y + arrowSize * sinA - (arrowSize / 2.5) * cosA
    );
    ctx.lineTo(
        toOff.x + arrowSize * cosA - (arrowSize / 2.5) * sinA,
        toOff.y + arrowSize * sinA + (arrowSize / 2.5) * cosA
    );
    ctx.closePath();
    ctx.fill();

    // Label pill
    ctx.font = `${fontSize}px Arial, sans-serif`;
    const textMetrics = ctx.measureText(label);
    const textW = textMetrics.width;
    const textH = fontSize;
    const pillW = textW + pillPadX * 2;
    const pillH = textH + pillPadY * 2;

    let labelAngle = angle;
    if (labelAngle > Math.PI / 2) labelAngle -= Math.PI;
    if (labelAngle < -Math.PI / 2) labelAngle += Math.PI;

    ctx.translate(mid.x, mid.y);
    ctx.rotate(labelAngle);

    const rx = -pillW / 2;
    const ry = -pillH / 2;
    ctx.beginPath();
    ctx.roundRect(rx, ry, pillW, pillH, pillRadius);
    ctx.fillStyle = DISTANCE_LABEL_BG;
    ctx.fill();
    ctx.strokeStyle = DISTANCE_LABEL_BORDER;
    ctx.lineWidth = lineWidth;
    ctx.stroke();

    ctx.fillStyle = DISTANCE_LABEL_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 0);

    ctx.restore();
}
