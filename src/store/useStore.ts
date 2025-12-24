import { create } from 'zustand';
import { PathShape } from '../model/path-shape';

export interface AppState {
    shapes: PathShape[];
    selectedShapes: string[]; // IDs of selected shapes
    tool: string;
    zoom: number;

    // Basic actions to update state
    setTool: (tool: string) => void;
    setZoom: (zoom: number) => void;
    setShapes: (shapes: PathShape[]) => void;
    setSelectedShapes: (ids: string[]) => void;
}

export const useStore = create<AppState>((set) => ({
    shapes: [],
    selectedShapes: [],
    tool: 'select', // Default tool
    zoom: 1, // Default zoom level

    setTool: (tool) => set({ tool }),
    setZoom: (zoom) => set({ zoom }),
    setShapes: (shapes) => set({ shapes }),
    setSelectedShapes: (selectedShapes) => set({ selectedShapes }),
}));
