import { StateCreator } from 'zustand';

export interface UiSlice {
    tool: string;
    zoom: number;
    isDarkMode: boolean;
    material: { width: number; height: number };
    setTool: (tool: string) => void;
    setZoom: (zoom: number) => void;
    setDarkMode: (isDarkMode: boolean) => void;
    setMaterial: (material: { width: number; height: number }) => void;
}

export const createUiSlice: StateCreator<UiSlice, [], [], UiSlice> = (set) => ({
    tool: 'select',
    zoom: 1,
    isDarkMode: true,
    material: { width: 1000, height: 800 },
    setTool: (tool) => set({ tool }),
    setZoom: (zoom) => set({ zoom }),
    setDarkMode: (isDarkMode) => set({ isDarkMode }),
    setMaterial: (material) => set({ material }),
});
