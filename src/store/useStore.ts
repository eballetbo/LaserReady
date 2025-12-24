import { create } from 'zustand';
import { PathShape } from '../model/path-shape';

export interface AppState {
    shapes: PathShape[];
    selectedShapes: string[]; // IDs of selected shapes
    tool: string;
    zoom: number;

    // State for UI
    isDarkMode: boolean;
    material: { width: number; height: number };

    // Basic actions to update state
    setTool: (tool: string) => void;
    setZoom: (zoom: number) => void;
    setShapes: (shapes: PathShape[]) => void;
    setSelectedShapes: (ids: string[]) => void;
    setDarkMode: (isDarkMode: boolean) => void;
    setMaterial: (material: { width: number; height: number }) => void;
}

export const useStore = create<AppState>((set) => ({
    shapes: [],
    selectedShapes: [],
    tool: 'select', // Default tool
    zoom: 1, // Default zoom level
    isDarkMode: true,
    material: { width: 1000, height: 800 },

    setTool: (tool) => set({ tool }),
    setZoom: (zoom) => set({ zoom }),
    setShapes: (shapes) => set({ shapes }),
    setSelectedShapes: (selectedShapes) => set({ selectedShapes }),
    setDarkMode: (isDarkMode) => set({ isDarkMode }),
    setMaterial: (material) => set({ material }),
}));
