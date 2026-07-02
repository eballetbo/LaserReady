/**
 * Application-wide constants
 * Centralized location for magic numbers and hard-coded values
 */

// ========================================
// GRID & CANVAS
// ========================================
export const PIXELS_PER_MM = 3.779527559; // 96 DPI
export const DEFAULT_GRID_SPACING = 10 * PIXELS_PER_MM; // 10mm (1cm) major grids
export const MINOR_GRID_SPACING = 1 * PIXELS_PER_MM;   // 1mm minor grids
export const DEFAULT_GRID_COLOR = '#e8e8e8';
export const MINOR_GRID_COLOR = '#f3f3f3';
export const DEFAULT_GRID_LINE_WIDTH = 1;
export const MINOR_GRID_MIN_SCREEN_PX = 4; // hide minor grid when lines are closer than this

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
export const NODE_CIRCLE_RADIUS = 4;          // anchor circle radius (screen px)
export const NODE_CIRCLE_STROKE = '#666666';
export const NODE_CIRCLE_FILL = '#FFFFFF';    // empty circle (unselected)
export const NODE_SELECTED_FILL = '#FF0000';
export const NODE_SELECTED_STROKE = '#AA0000';
export const NODE_HOVER_RING_OFFSET = 3;      // extra radius for hover ring (screen px)
export const NODE_HOVER_RING_COLOR = 'rgba(0, 102, 255, 0.4)';
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
export const DEFAULT_FONT_SIZE = 96;
export const DEFAULT_FONT_FAMILY = 'Arial';
export const DEFAULT_FONT_WEIGHT = 'normal';
export const DEFAULT_FONT_STYLE = 'normal';
export const TEXT_LINE_HEIGHT_MULTIPLIER = 1.2;
export const TEXT_STROKE_WIDTH = 1;

export const AVAILABLE_FONTS: { name: string; category: string }[] = [
    // Sans-serif — clean lines, ideal for laser cutting
    { name: 'Arial', category: 'Sans-Serif' },
    { name: 'Roboto', category: 'Sans-Serif' },
    { name: 'Open Sans', category: 'Sans-Serif' },
    { name: 'Lato', category: 'Sans-Serif' },
    { name: 'Montserrat', category: 'Sans-Serif' },
    { name: 'Poppins', category: 'Sans-Serif' },
    { name: 'Raleway', category: 'Sans-Serif' },
    { name: 'Nunito', category: 'Sans-Serif' },
    { name: 'Ubuntu', category: 'Sans-Serif' },
    { name: 'Noto Sans', category: 'Sans-Serif' },
    { name: 'Oswald', category: 'Sans-Serif' },
    { name: 'Verdana', category: 'Sans-Serif' },
    // Display — bold, decorative, great for engraving and signage
    { name: 'Bebas Neue', category: 'Display' },
    { name: 'Anton', category: 'Display' },
    { name: 'Righteous', category: 'Display' },
    { name: 'Bungee', category: 'Display' },
    { name: 'Black Ops One', category: 'Display' },
    { name: 'Permanent Marker', category: 'Display' },
    { name: 'Orbitron', category: 'Display' },
    // Serif — classic, good for formal engraving
    { name: 'Times New Roman', category: 'Serif' },
    { name: 'Georgia', category: 'Serif' },
    { name: 'Playfair Display', category: 'Serif' },
    { name: 'Merriweather', category: 'Serif' },
    // Script — decorative handwriting, beautiful for gifts/awards
    { name: 'Dancing Script', category: 'Script' },
    { name: 'Pacifico', category: 'Script' },
    { name: 'Great Vibes', category: 'Script' },
    { name: 'Sacramento', category: 'Script' },
    // Monospace — technical/industrial look
    { name: 'Courier New', category: 'Monospace' },
    { name: 'Roboto Mono', category: 'Monospace' },
];

// ========================================
// ZOOM & TRANSFORM
// ========================================
export const DEFAULT_ZOOM = 1;
export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 50;
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
// DISTANCE HELPER (pen tool dimension annotation)
// ========================================
export const DISTANCE_LABEL_FONT_SIZE = 11;    // screen pixels
export const DISTANCE_LABEL_COLOR = '#333333';
export const DISTANCE_LABEL_BG = '#FFFFFF';
export const DISTANCE_LABEL_BORDER = '#CCCCCC';
export const DISTANCE_ARROW_SIZE = 6;          // screen pixels
export const DISTANCE_LINE_OFFSET = 16;        // screen pixels, perpendicular offset
export const DISTANCE_LINE_COLOR = '#333333';

// ========================================
// TOLERANCES & THRESHOLDS
// ========================================
export const POINT_EQUALITY_THRESHOLD = 0.1;
