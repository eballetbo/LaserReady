declare module '*.svg' {
    const content: string;
    export default content;
}

declare module '*.svg?raw' {
    const content: string;
    export default content;
}

declare const __APP_VERSION__: string;

// Debug globals exposed in DEV mode for E2E testing
interface Window {
    useStore?: unknown;
    store?: unknown;
    editorInstance?: unknown;
}
