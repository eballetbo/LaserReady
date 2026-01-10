import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electron', {
    // Expose methods here
})
