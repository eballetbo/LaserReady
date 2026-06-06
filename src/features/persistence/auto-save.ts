import { useStore } from '../../store/useStore';
import { serializeProject, deserializeShapes, LaserProject, validateProject } from './project-format';
import { notify } from '../ui/toast-utils';

const DB_NAME = 'LaserReady';
const DB_VERSION = 1;
const STORE_NAME = 'autosave';
const AUTOSAVE_KEY = 'current-session';

let db: IDBDatabase | null = null;
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function openDB(): Promise<IDBDatabase> {
    if (db) return Promise.resolve(db);

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const database = request.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onerror = () => reject(request.error);
    });
}

async function saveToIndexedDB(project: LaserProject): Promise<void> {
    const database = await openDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        store.put(project, AUTOSAVE_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

export async function loadFromIndexedDB(): Promise<LaserProject | null> {
    try {
        const database = await openDB();
        return new Promise((resolve, reject) => {
            const tx = database.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const request = store.get(AUTOSAVE_KEY);
            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    } catch {
        return null;
    }
}

export function triggerAutoSave(): void {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        const state = useStore.getState();
        const project = serializeProject(
            state.shapes,
            state.layers,
            state.activeLayerId,
            state.material
        );
        saveToIndexedDB(project).catch(() => {
            notify('Auto-save failed. Changes may not persist.', 'warning');
        });
    }, 500);
}

export async function restoreSession(): Promise<boolean> {
    const project = await loadFromIndexedDB();
    if (!project || !project.shapes || project.shapes.length === 0) return false;

    const validation = validateProject(project);
    if (!validation.valid) {
        notify('Saved session is corrupted and cannot be restored.', 'warning');
        return false;
    }

    try {
        const shapes = deserializeShapes(project.shapes);
        const state = useStore.getState();
        state.setShapes(shapes);
        if (project.layers) state.setLayers(project.layers);
        if (project.activeLayerId) state.setActiveLayerId(project.activeLayerId);
        if (project.material) state.setMaterial(project.material);
        return true;
    } catch {
        notify('Failed to restore previous session.', 'warning');
        return false;
    }
}

export function exportProjectFile(): string {
    const state = useStore.getState();
    const project = serializeProject(
        state.shapes,
        state.layers,
        state.activeLayerId,
        state.material
    );
    project.metadata = {
        ...project.metadata,
        createdAt: project.metadata?.createdAt || new Date().toISOString(),
        modifiedAt: new Date().toISOString()
    };
    return JSON.stringify(project, null, 2);
}

export function importProjectFile(json: string): boolean {
    try {
        const parsed = JSON.parse(json);
        const validation = validateProject(parsed, json.length);
        if (!validation.valid) {
            notify('Project file is invalid: ' + validation.errors.join(', '), 'error');
            return false;
        }

        const project = parsed as LaserProject;
        const shapes = deserializeShapes(project.shapes);
        const state = useStore.getState();
        state.setShapes(shapes);
        if (project.layers) state.setLayers(project.layers);
        if (project.activeLayerId) state.setActiveLayerId(project.activeLayerId);
        if (project.material) state.setMaterial(project.material);
        return true;
    } catch {
        notify('Failed to import project file.', 'error');
        return false;
    }
}
