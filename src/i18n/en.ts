export interface Translation {
    // Toolbar
    select: string;
    nodeEdit: string;
    rect: string;
    circle: string;
    polygon: string;
    penTool: string;

    // Properties Panel
    properties: string;
    booleanOperations: string;
    unite: string;
    subtract: string;
    intersect: string;
    exclude: string;
    delete: string;
    dimensions: string;
    width: string;
    height: string;
    laserMode: string;
    cut: string;
    cutDesc: string;
    score: string;
    scoreDesc: string;
    engrave: string;
    engraveDesc: string;
    noSelection: string;

    // App
    editorAlpha: string;
    area: string;
    import: string;
    export: string;
    undo: string;
    redo: string;
    zoomIn: string;
    zoomOut: string;
    resetZoom: string;

    // Language
    language: string;
    lang_en: string;
    lang_es: string;
    lang_ca: string;

    // Shapes
    shapes: string;
    triangle: string;
    pentagon: string;
    star: string;

    // Properties
    shapeProperties: string;
    sides: string;
    points: string;
    innerRadius: string;

    // Asset Library
    library: string;
    dragAndDrop: string;

    // Text Tool
    textTool: string;
    textProperties: string;
    content: string;
    fontFamily: string;
    fontSize: string;
}

export const en: Translation = {
    // Toolbar
    select: "Select",
    nodeEdit: "Node Edit",
    rect: "Rectangle",
    circle: "Circle",
    polygon: "Polygon",
    penTool: "Pen Tool",

    // Properties Panel
    properties: "Properties",
    booleanOperations: "Boolean Operations",
    unite: "Unite",
    subtract: "Subtract",
    intersect: "Intersect",
    exclude: "Exclude",
    delete: "Delete",
    dimensions: "Dimensions",
    width: "Width",
    height: "Height",
    laserMode: "Laser Mode",
    cut: "Cut",
    cutDesc: "Red Stroke",
    score: "Score",
    scoreDesc: "Blue Stroke",
    engrave: "Engrave",
    engraveDesc: "Black Fill",
    noSelection: "Select an element to edit.",

    // App
    editorAlpha: "EDITOR (ALPHA)",
    area: "AREA",
    import: "Import",
    export: "Export",
    undo: "Undo",
    redo: "Redo",
    zoomIn: "Zoom In",
    zoomOut: "Zoom Out",
    resetZoom: "Reset Zoom",

    // Language
    language: "Language",
    lang_en: "English",
    lang_es: "Spanish",
    lang_ca: "Catalan",
    // Shapes
    shapes: 'Shapes',
    triangle: 'Triangle',
    pentagon: 'Pentagon',
    star: 'Star',

    // Properties
    shapeProperties: 'Shape Properties',
    sides: 'Sides',
    points: 'Points',
    innerRadius: 'Inner Radius',

    // Asset Library
    library: 'Library',
    dragAndDrop: 'Drag & Drop icons to canvas',

    // Text Tool
    textTool: "Text Tool",
    textProperties: "Text Properties",
    content: "Content",
    fontFamily: "Font Family",
    fontSize: "Font Size",
};
