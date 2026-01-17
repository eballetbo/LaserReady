import { create } from 'zustand';
import { createShapesSlice, ShapesSlice } from './slices/shapes';
import { createUiSlice, UiSlice } from './slices/ui';

// Combine the slice interfaces into the main AppState
export type AppState = ShapesSlice & UiSlice;

export const useStore = create<AppState>()((...a) => ({
    ...createShapesSlice(...a),
    ...createUiSlice(...a),
}));

// Expose store for E2E testing
if (typeof window !== 'undefined') {
    (window as any).useStore = useStore;
    (window as any).store = useStore;
}
