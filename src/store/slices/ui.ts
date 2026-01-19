import { StateCreator } from 'zustand';
import { PIXELS_PER_MM } from '../../config/constants';

export interface UiSlice {
    tool: string;
    zoom: number;
    pan: { x: number; y: number };
    isDarkMode: boolean;
    material: { width: number; height: number };
    selectedNodeIndices: number[];
    isSnappingEnabled: boolean;
    filletRadius: number;
    setTool: (tool: string) => void;
    setZoom: (zoom: number) => void;
    setPan: (pan: { x: number; y: number }) => void;
    setDarkMode: (isDarkMode: boolean) => void;
    setMaterial: (material: { width: number; height: number }) => void;
    setSelectedNodeIndices: (indices: number[]) => void;
    setSnappingEnabled: (enabled: boolean) => void;
    setFilletRadius: (radius: number) => void;
    zoomAtPoint: (delta: number, x: number, y: number) => void;
}

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (set, get) => ({
    tool: 'select',
    zoom: 1,
    pan: { x: 0, y: 0 },
    isDarkMode: false,
    material: { width: 1000 * PIXELS_PER_MM, height: 800 * PIXELS_PER_MM },
    selectedNodeIndices: [],
    isSnappingEnabled: true,
    filletRadius: 5,
    setTool: (tool) => set({ tool }),
    setZoom: (zoom) => set({ zoom }),
    setPan: (pan) => set({ pan }),
    setDarkMode: (isDarkMode) => set({ isDarkMode }),
    setMaterial: (material) => set({ material }),
    setSelectedNodeIndices: (selectedNodeIndices) => set({ selectedNodeIndices }),
    setSnappingEnabled: (isSnappingEnabled) => set({ isSnappingEnabled }),
    setFilletRadius: (filletRadius) => set({ filletRadius }),
    zoomAtPoint: (delta, mouseX, mouseY) => {
        const { zoom, pan } = get();
        const newZoom = Math.min(Math.max(zoom * delta, 0.1), 50);

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
