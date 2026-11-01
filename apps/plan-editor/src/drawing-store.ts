import { createStore } from 'idb-keyval';
// Scene and camera backups share one record so an import commits atomically.
export const drawingStore = createStore('insaat-pascal-drawings', 'drawings');
