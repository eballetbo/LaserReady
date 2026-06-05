/**
 * Configuration options for the CanvasRenderer.
 * Defines visual styles and dimensions for UI elements like handles, anchors, and grid.
 */
export interface RendererConfig {
    /** Spacing between grid lines in pixels. Default: 20 */
    gridSpacing?: number;
    /** Size of the anchor squares (nodes) in pixels. */
    anchorSize: number;
    /** Radius of the bezier handle circles in pixels. */
    handleRadius: number;
    /** Color of the node anchors. */
    colorAnchor: string;
    /** Color of the bezier handles. */
    colorHandle: string;
    /** Color of the lines connecting anchors to handles. */
    colorHandleLine: string;
    /** Default stroke color for shapes. */
    colorStroke: string;
    /** Default fill color for shapes. */
    colorFill: string;
    /** Color used for selection highlights and bounding boxes. */
    colorSelection: string;
}
