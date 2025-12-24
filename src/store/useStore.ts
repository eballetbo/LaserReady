import { create } from 'zustand';
import { createShapesSlice, ShapesSlice } from './slices/shapes';
import { createUiSlice, UiSlice } from './slices/ui';

// Combine the slice interfaces into the main AppState
export type AppState = ShapesSlice & UiSlice;

export const useStore = create<AppState>()((...a) => ({
    ...createShapesSlice(...a),
    ...createUiSlice(...a),
}));
