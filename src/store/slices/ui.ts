import { StateCreator } from 'zustand';
import { PIXELS_PER_MM } from '../../config/constants';

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
    material: { width: 1000 * PIXELS_PER_MM, height: 800 * PIXELS_PER_MM },
    setTool: (tool) => set({ tool }),
    setZoom: (zoom) => set({ zoom }),
    setDarkMode: (isDarkMode) => set({ isDarkMode }),
    setMaterial: (material) => set({ material }),
});
