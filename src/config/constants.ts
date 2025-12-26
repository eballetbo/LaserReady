/**
 * Application-wide constants
 * Centralized location for magic numbers and hard-coded values
 */

// ========================================
// GRID & CANVAS
// ========================================
export const DEFAULT_GRID_SPACING = 25;
export const DEFAULT_GRID_COLOR = '#f0f0f0';
export const DEFAULT_GRID_LINE_WIDTH = 1;

// ========================================
// COLORS
// ========================================
export const SELECTION_COLOR = '#00a8ff';
export const ANCHOR_COLOR = '#007bff';
export const HANDLE_COLOR = '#ff3333';
export const HANDLE_LINE_COLOR = '#ffaaaa';
export const DEFAULT_STROKE_COLOR = '#333';
export const DEFAULT_FILL_COLOR = 'rgba(0, 123, 255, 0.05)';
export const DEFAULT_LAYER_COLOR = '#000000';
export const PEN_PREVIEW_COLOR = '#999';

// ========================================
// SIZES & DIMENSIONS
// ========================================
export const ANCHOR_SIZE = 8;
export const HANDLE_RADIUS = 5;
export const DEFAULT_STROKE_WIDTH = 1;
export const SELECTION_LINE_WIDTH = 2;
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
