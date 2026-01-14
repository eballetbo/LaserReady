import { StateCreator } from 'zustand';
import { IShape } from '../../features/shapes/types';
import { LaserLayer } from '../../types/layer';

export interface ShapesSlice {
    shapes: IShape[];
    selectedShapes: string[];
    layers: LaserLayer[];
    activeLayerId: string;
    setShapes: (shapes: IShape[]) => void;
    setSelectedShapes: (ids: string[]) => void;
    setLayers: (layers: LaserLayer[]) => void;
    setActiveLayerId: (id: string) => void;
    updateShape: (shape: IShape) => void;
    addShapes: (shapes: IShape[]) => void;
    removeShapes: (ids: string[]) => void;
}

const defaultLayer: LaserLayer = {
    id: 'layer-1',
    name: 'Default Layer',
    color: '#000000',
    mode: 'CUT'
};

export const createShapesSlice: StateCreator<ShapesSlice, [], [], ShapesSlice> = (set) => ({
    shapes: [],
    selectedShapes: [],
    layers: [defaultLayer],
    activeLayerId: defaultLayer.id,
    setShapes: (shapes) => set({ shapes }),
    setSelectedShapes: (selectedShapes) => set({ selectedShapes }),
    setLayers: (layers) => set({ layers }),
    setActiveLayerId: (activeLayerId) => set({ activeLayerId }),
    updateShape: (updatedShape) => set((state) => ({
        shapes: state.shapes.map(s => s.id === updatedShape.id ? updatedShape : s)
    })),
    addShapes: (newShapes) => set((state) => ({
        shapes: [...state.shapes, ...newShapes]
    })),
    removeShapes: (ids) => set((state) => ({
        shapes: state.shapes.filter(s => !ids.includes(s.id)),
        selectedShapes: state.selectedShapes.filter(id => !ids.includes(id))
    })),
});
