import { createStore, get, update } from 'idb-keyval';
import type { SceneGraph } from '@pascal-app/editor';

// A separate database: never touches the financial app's Supabase tables or uploads.
const store = createStore('insaat-pascal-drawings', 'drawings');
type Drawing = { scene: SceneGraph; previous?: SceneGraph; importBackup?: SceneGraph; updatedAt: string; revision: number };
let revision = 0;
let loaded = false;
export async function readDrawing(key: string): Promise<SceneGraph | null> {
  loaded = false;
  const drawing = await get<Drawing>(key, store);
  revision = drawing?.revision ?? 0;
  loaded = true;
  return drawing?.scene ?? null;
}
export async function saveDrawing(key: string, scene: SceneGraph) {
  if (!loaded) throw new Error('Drawing has not loaded');
  // The read/compare/write is one IndexedDB transaction. A second tab may not overwrite this tab's work.
  await update<Drawing>(key, current => {
    if ((current?.revision ?? 0) !== revision) throw new Error('Drawing changed in another tab');
    if (current && Object.keys(current.scene.nodes).length > 4 && Object.keys(scene.nodes).length <= 4) {
      throw new Error('Unexpected empty drawing');
    }
    return { scene, previous: current?.scene, importBackup: current?.importBackup, revision: revision + 1, updatedAt: new Date().toISOString() };
  }, store);
  revision += 1;
}

export async function replaceFromBackup(key: string, scene: SceneGraph) {
  if (!loaded) throw new Error('Drawing has not loaded');
  await update<Drawing>(key, current => {
    if ((current?.revision ?? 0) !== revision) throw new Error('Drawing changed in another tab');
    return { scene, importBackup: current?.scene, revision: revision + 1, updatedAt: new Date().toISOString() };
  }, store);
  revision += 1;
}
export async function getImportBackup(key: string) {
  return (await get<Drawing>(key, store))?.importBackup;
}
