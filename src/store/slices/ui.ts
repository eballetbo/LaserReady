import { StateCreator } from 'zustand';
import { PIXELS_PER_MM, MIN_ZOOM, MAX_ZOOM } from '../../config/constants';
import { ToolType } from '../../config/shortcuts';

export interface UiSlice {
    tool: ToolType;
    zoom: number;
    pan: { x: number; y: number };
    isDarkMode: boolean;
    material: { width: number; height: number };
    selectedNodeIndices: number[];
    hoveredNodeIndex: number;
    isSnappingEnabled: boolean;
    filletRadius: number;
    setTool: (tool: ToolType) => void;
    setZoom: (zoom: number) => void;
    setPan: (pan: { x: number; y: number }) => void;
    setDarkMode: (isDarkMode: boolean) => void;
    setMaterial: (material: { width: number; height: number }) => void;
    setSelectedNodeIndices: (indices: number[]) => void;
    setHoveredNodeIndex: (index: number) => void;
    setSnappingEnabled: (enabled: boolean) => void;
    setFilletRadius: (radius: number) => void;
    offsetDistance: number;
    offsetJoin: 'round' | 'miter' | 'bevel';
    setOffsetDistance: (distance: number) => void;
    setOffsetJoin: (join: 'round' | 'miter' | 'bevel') => void;
    zoomAtPoint: (delta: number, x: number, y: number) => void;
}

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (set, get) => ({
    tool: 'select',
    zoom: 1,
    pan: { x: 0, y: 0 },
    isDarkMode: false,
    material: { width: 1000 * PIXELS_PER_MM, height: 800 * PIXELS_PER_MM },
    selectedNodeIndices: [],
    hoveredNodeIndex: -1,
    isSnappingEnabled: false,
    filletRadius: 5 * PIXELS_PER_MM,
    offsetDistance: 5 * PIXELS_PER_MM, // Default 5mm
    offsetJoin: 'round',
    setTool: (tool) => set({ tool }),
    setZoom: (zoom) => set({ zoom }),
    setPan: (pan) => set({ pan }),
    setDarkMode: (isDarkMode) => set({ isDarkMode }),
    setMaterial: (material) => set({ material }),
    setSelectedNodeIndices: (selectedNodeIndices) => set({ selectedNodeIndices }),
    setHoveredNodeIndex: (hoveredNodeIndex) => set({ hoveredNodeIndex }),
    setSnappingEnabled: (isSnappingEnabled) => set({ isSnappingEnabled }),
    setFilletRadius: (filletRadius) => set({ filletRadius }),
    setOffsetDistance: (offsetDistance) => set({ offsetDistance }),
    setOffsetJoin: (offsetJoin) => set({ offsetJoin }),
    zoomAtPoint: (delta, mouseX, mouseY) => {
        const { zoom, pan } = get();
        const newZoom = Math.min(Math.max(zoom * delta, MIN_ZOOM), MAX_ZOOM);

        // Calculate world point under mouse before zoom
        const worldX = (mouseX - pan.x) / zoom;
        const worldY = (mouseY - pan.y) / zoom;

        // Calculate new pan so that world point remains under mouse
        // mouseX = worldX * newZoom + newPanX
        // newPanX = mouseX - worldX * newZoom
        const newPan = {
            x: mouseX - worldX * newZoom,
            y: mouseY - worldY * newZoom
        };

        set({ zoom: newZoom, pan: newPan });
    }
});
