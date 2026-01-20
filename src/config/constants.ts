/**
 * Application-wide constants
 * Centralized location for magic numbers and hard-coded values
 */

// ========================================
// GRID & CANVAS
// ========================================
export const PIXELS_PER_MM = 3.779527559; // 96 DPI
export const DEFAULT_GRID_SPACING = 10 * PIXELS_PER_MM; // 10mm (1cm) grids
export const DEFAULT_GRID_COLOR = '#f0f0f0';
export const DEFAULT_GRID_LINE_WIDTH = 1;

// ========================================
// COLORS
// ========================================
export const SELECTION_COLOR = '#555555';
export const ANCHOR_COLOR = '#007bff';
export const HANDLE_COLOR = '#ff3333';
export const HANDLE_LINE_COLOR = '#ffaaaa';
export const DEFAULT_STROKE_COLOR = '#333';
export const DEFAULT_FILL_COLOR = 'rgba(0, 123, 255, 0.05)';
export const DEFAULT_LAYER_COLOR = '#000000';
export const PEN_PREVIEW_COLOR = '#000000';

export const NODE_SKELETON_COLOR = '#888888';
export const NODE_CORNER_COLOR = '#0000FF'; // Blue
export const NODE_SMOOTH_COLOR = '#008000'; // Green
export const NODE_OnPATH_COLOR = '#DD00DD'; // Purple for nodes on path (if needed) or just start
export const NODE_START_COLOR = '#00AA00'; // Slightly different green for start? Or maybe an arrow. Let's stick to Green circle for now, maybe use a larger size or ring.
export const NODE_HANDLE_LINE_COLOR = '#555555'; // Dark gray/black for contrast
export const NODE_HANDLE_LINE_DASH = [2, 2] as const;


// ========================================
// SIZES & DIMENSIONS
// ========================================
export const ANCHOR_SIZE = 8;
export const HANDLE_RADIUS = 5;
export const NODE_SKELETON_WIDTH = 0.5;
export const NODE_HANDLE_CIRCLE_RADIUS = 3;
export const DEFAULT_STROKE_WIDTH = 1;
export const SELECTION_DASH_PATTERN = [8, 12] as const;
export const SELECTION_DASH_SPEED = 25; // pixels per second
export const PEN_DASH_PATTERN = [5, 5] as const;
export const ROTATION_HANDLE_OFFSET = 20;

// ========================================
// TEXT DEFAULTS
// ========================================
export const DEFAULT_FONT_SIZE = 24;
export const DEFAULT_FONT_FAMILY = 'Arial';
export const DEFAULT_FONT_WEIGHT = 'normal';
export const DEFAULT_FONT_STYLE = 'normal';
export const TEXT_LINE_HEIGHT_MULTIPLIER = 1.2;
export const TEXT_STROKE_WIDTH = 1;

// ========================================
// ZOOM & TRANSFORM
// ========================================
export const DEFAULT_ZOOM = 1;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 5;
export const ZOOM_STEP = 1.2;

// ========================================
// EDITOR CONFIGURATION
// ========================================
export const EDITOR_CONFIG = {
    anchorSize: ANCHOR_SIZE,
    handleRadius: HANDLE_RADIUS,
    colorAnchor: ANCHOR_COLOR,
    colorHandle: HANDLE_COLOR,
    colorHandleLine: HANDLE_LINE_COLOR,
    colorStroke: DEFAULT_STROKE_COLOR,
    colorFill: DEFAULT_FILL_COLOR,
    colorSelection: SELECTION_COLOR,
    gridSpacing: DEFAULT_GRID_SPACING
} as const;

// ========================================
// TOLERANCES & THRESHOLDS
// ========================================
export const POINT_EQUALITY_THRESHOLD = 0.1;
