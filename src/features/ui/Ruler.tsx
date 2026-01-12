import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '../../store/useStore';
import { PIXELS_PER_MM } from '../../config/constants';

interface RulerProps {
    orientation: 'horizontal' | 'vertical';
}

const RULER_SIZE = 20;
const FONT_SIZE = 10;
const MAJOR_TICK_HEIGHT = 10; // Height of the tick mark
const MINOR_TICK_HEIGHT = 5;

export const Ruler: React.FC<RulerProps> = ({ orientation }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [mousePos, setMousePos] = useState<number | null>(null);

    // Get State from Store
    const zoom = useStore((state) => state.zoom);
    const pan = useStore((state) => state.pan);

    // Dynamic Step Calculation
    const calculateIntervals = (zoomLevel: number) => {
        // Robustness check
        if (!zoomLevel || zoomLevel <= 0) return { labelStepMm: 10, tickStepMm: 1, ticksPerLabel: 10 };

        const MIN_LABEL_SPACING_PX = 60;
        const MIN_TICK_SPACING_PX = 5;

        // 1. Calculate rough label step in mm
        const roughLabelStepMm = MIN_LABEL_SPACING_PX / (PIXELS_PER_MM * zoomLevel);

        // 2. Snap to power of 10
        const magnitude = Math.pow(10, Math.floor(Math.log10(roughLabelStepMm)));
        const normalizedStep = roughLabelStepMm / magnitude;

        let labelStepMm;
        if (normalizedStep <= 1) labelStepMm = 1 * magnitude;
        else if (normalizedStep <= 2) labelStepMm = 2 * magnitude;
        else if (normalizedStep <= 5) labelStepMm = 5 * magnitude;
        else labelStepMm = 10 * magnitude;

        // 3. Determine subdivisions (ticks)
        let ticksPerLabel = 10;
        let tickStepMm = labelStepMm / 10;

        // Verify min spacing
        if (tickStepMm * PIXELS_PER_MM * zoomLevel < MIN_TICK_SPACING_PX) {
            ticksPerLabel = 5;
            tickStepMm = labelStepMm / 5;
            if (tickStepMm * PIXELS_PER_MM * zoomLevel < MIN_TICK_SPACING_PX) {
                ticksPerLabel = 2;
                tickStepMm = labelStepMm / 2;
                if (tickStepMm * PIXELS_PER_MM * zoomLevel < MIN_TICK_SPACING_PX) {
                    ticksPerLabel = 1;
                    tickStepMm = labelStepMm;
                }
            }
        }

        return { labelStepMm, tickStepMm, ticksPerLabel };
    };

    const draw = () => {
        const canvas = canvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Resize Canvas to match container
        const { clientWidth, clientHeight } = container;
        const dpr = window.devicePixelRatio || 1;

        // Optimize: verify logic before drawing
        if (clientWidth === 0 || clientHeight === 0) return;

        canvas.width = clientWidth * dpr;
        canvas.height = clientHeight * dpr;
        canvas.style.width = `${clientWidth}px`;
        canvas.style.height = `${clientHeight}px`;
        ctx.scale(dpr, dpr);

        ctx.clearRect(0, 0, clientWidth, clientHeight);

        // Styling
        ctx.fillStyle = '#F5F5F5';
        ctx.fillRect(0, 0, clientWidth, clientHeight);
        ctx.fillStyle = '#333';
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        ctx.font = `${FONT_SIZE}px sans-serif`;
        ctx.textBaseline = 'top';

        const isHorizontal = orientation === 'horizontal';
        const length = isHorizontal ? clientWidth : clientHeight;

        // World Space Calculation
        // Add buffer to ensure we iterate ticks that are slightly off-screen but visible due to size/margin
        const BUFFER = 4096;
        const startPixel = -BUFFER;
        const endPixel = length + BUFFER;

        // Guard against NaN pan/zoom
        const safeZoom = zoom || 1;
        const safePan = { x: pan?.x ?? 0, y: pan?.y ?? 0 };

        const startWorld = (startPixel - (isHorizontal ? safePan.x : safePan.y)) / safeZoom;
        const endWorld = (endPixel - (isHorizontal ? safePan.x : safePan.y)) / safeZoom;

        const { tickStepMm, ticksPerLabel } = calculateIntervals(safeZoom);

        // Safety check
        if (!tickStepMm || tickStepMm <= 0) return;

        // Align start to the nearest tick
        const startTickIndex = Math.floor(startWorld / tickStepMm);
        const endTickIndex = Math.ceil(endWorld / tickStepMm);

        const ticksPerMedium = Math.round(ticksPerLabel / 2);

        // Limit iteration count for safety (e.g. if bug causes infinite loop)
        // Increased to 100,000 to prevent premature abort on large screens/extreme zooms
        const MAX_TICKS = 100000;
        if (endTickIndex - startTickIndex > MAX_TICKS) {
            // Fallback or abort to prevent freeze
            return;
        }

        ctx.beginPath();

        for (let i = startTickIndex; i <= endTickIndex; i++) {
            const worldMm = i * tickStepMm;
            // Fix floating point precision issues (e.g. 0.300000000004)
            const correctedWorldMm = Math.round(worldMm * 10000) / 10000;
            const worldPx = correctedWorldMm * PIXELS_PER_MM;
            const screenPx = worldPx * safeZoom + (isHorizontal ? safePan.x : safePan.y);

            if (screenPx < -BUFFER || screenPx > length + BUFFER) continue;

            const isLabel = (i % ticksPerLabel === 0);
            const isMedium = !isLabel && (ticksPerLabel % 2 === 0) && (i % ticksPerMedium === 0);

            const tickLen = isLabel ? MAJOR_TICK_HEIGHT : (isMedium ? 7 : MINOR_TICK_HEIGHT);

            if (isHorizontal) {
                ctx.moveTo(screenPx, RULER_SIZE - tickLen);
                ctx.lineTo(screenPx, RULER_SIZE);
                if (isLabel) {
                    // Added 3px margin from top
                    ctx.fillText(correctedWorldMm.toString(), screenPx + 2, 3);
                }
            } else {
                ctx.moveTo(RULER_SIZE - tickLen, screenPx);
                ctx.lineTo(RULER_SIZE, screenPx);
                if (isLabel) {
                    ctx.save();
                    // Added 3px margin from left (which is top after rotation)
                    ctx.translate(3, screenPx + 2);
                    ctx.rotate(-Math.PI / 2);
                    ctx.fillText(correctedWorldMm.toString(), 0, 0);
                    ctx.restore();
                }
            }
        }
        ctx.stroke();
    };

    useEffect(() => {
        draw();
    }, [zoom, pan, orientation]);

    // Handle Resize
    useEffect(() => {
        const handleResize = () => draw();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Mouse Tracking
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();

            if (orientation === 'horizontal') {
                // Track X relative to ruler left
                const x = e.clientX - rect.left;
                if (x >= 0 && x <= rect.width) {
                    setMousePos(x);
                } else {
                    setMousePos(null);
                }
            } else {
                const y = e.clientY - rect.top;
                if (y >= 0 && y <= rect.height) {
                    setMousePos(y);
                } else {
                    setMousePos(null);
                }
            }
        };

        // Listen on window to catch mouse movement everywhere
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [orientation]);


    const isHorizontal = orientation === 'horizontal';

    return (
        <div
            ref={containerRef}
            className="relative overflow-hidden bg-gray-50 border-gray-300 box-border select-none"
            style={{
                width: isHorizontal ? '100%' : `${RULER_SIZE}px`,
                height: isHorizontal ? `${RULER_SIZE}px` : '100%',
                borderBottom: isHorizontal ? '1px solid #ddd' : 'none',
                borderRight: !isHorizontal ? '1px solid #ddd' : 'none',
            }}
        >
            <canvas ref={canvasRef} className="block w-full h-full" />

            {/* Mouse Indicator */}
            {mousePos !== null && (
                <div
                    className="absolute bg-blue-500 pointer-events-none"
                    style={{
                        left: isHorizontal ? `${mousePos}px` : 0,
                        top: isHorizontal ? 0 : `${mousePos}px`,
                        width: isHorizontal ? '1px' : '100%',
                        height: isHorizontal ? '100%' : '1px',
                        opacity: 0.8
                    }}
                />
            )}
        </div>
    );
};
