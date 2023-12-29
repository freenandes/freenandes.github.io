declare module 'mark.js';
declare module 'lozad';
declare module 'tippy.js/dist/tippy.esm.js';
declare global {
    interface Window {
        storeScrollPosition?: () => void;
        restoreScrollPosition?: () => void;
    }
}