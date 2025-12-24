import { StateCreator } from 'zustand';
import { PathShape } from '../../features/shapes/path-shape';
import { LaserLayer } from '../../types/layer';

export interface ShapesSlice {
    shapes: PathShape[];
    selectedShapes: string[];
    layers: LaserLayer[];
    activeLayerId: string;
    setShapes: (shapes: PathShape[]) => void;
    setSelectedShapes: (ids: string[]) => void;
    setLayers: (layers: LaserLayer[]) => void;
    setActiveLayerId: (id: string) => void;
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
});
