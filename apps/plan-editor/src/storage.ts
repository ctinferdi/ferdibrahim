import { get, update } from 'idb-keyval';
import { drawingStore as store } from './drawing-store.ts';
import { validateViews, type SavedView } from './saved-views.ts';
import type { SceneGraph } from '@pascal-app/editor';

// A separate database: never touches the financial app's Supabase tables or uploads.
type Drawing = { scene?: SceneGraph; previous?: SceneGraph; importBackup?: SceneGraph; views?: SavedView[]; importBackupViews?: SavedView[]; updatedAt: string; revision: number };
let revision = 0;
let loaded = false;
let loadedKey = '';
let pending: Promise<unknown> = Promise.resolve();
function serialize<T>(operation: () => Promise<T>): Promise<T> {
  const next = pending.then(operation);
  pending = next.catch(() => {});
  return next;
}
export function readDrawing(key: string): Promise<SceneGraph | null> { return serialize(async () => {
  loaded = false;
  const drawing = await get<Drawing>(key, store);
  revision = drawing?.revision ?? 0;
  loaded = true;
  loadedKey = key;
  return drawing?.scene ?? null;
}); }
export function saveDrawing(key: string, scene: SceneGraph) { return serialize(async () => {
  if (!loaded || loadedKey !== key) throw new Error('Drawing has not loaded');
  // The read/compare/write is one IndexedDB transaction. A second tab may not overwrite this tab's work.
  await update<Drawing>(key, current => {
    if ((current?.revision ?? 0) !== revision) throw new Error('Drawing changed in another tab');
    if (current?.scene && Object.keys(current.scene.nodes).length > 4 && Object.keys(scene.nodes).length <= 4) {
      throw new Error('Unexpected empty drawing');
    }
    return { ...current, scene, previous: current?.scene, revision: revision + 1, updatedAt: new Date().toISOString() };
  }, store);
  revision += 1;
}); }

export function replaceFromBackup(key: string, scene: SceneGraph, views?: SavedView[]) { return serialize(async () => {
  if (!loaded || loadedKey !== key) throw new Error('Drawing has not loaded');
  const validated = views === undefined ? undefined : validateViews(views);
  await update<Drawing>(key, current => {
    if ((current?.revision ?? 0) !== revision) throw new Error('Drawing changed in another tab');
    return { ...current, scene, views: validated ?? current?.views, importBackup: current?.scene, importBackupViews: current?.views, revision: revision + 1, updatedAt: new Date().toISOString() };
  }, store);
  revision += 1;
}); }
export async function getImportBackup(key: string) {
  return (await get<Drawing>(key, store))?.importBackup;
}
export async function getImportBackupViews(key: string) {
  return (await get<Drawing>(key, store))?.importBackupViews;
}
