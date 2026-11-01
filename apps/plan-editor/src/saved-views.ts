import { createStore, get, update } from 'idb-keyval';
import type { CameraPose } from '@pascal-app/core';
import { normalizeCameraPose } from '../vendor/editor/src/lib/camera-pose.ts';

import { drawingStore } from './drawing-store.ts';
const legacyStore = createStore('insaat-pascal-views', 'views');
export type SavedView = { id: string; name: string; pose: CameraPose };
export function validateView(value: SavedView): SavedView {
  if (!value || typeof value.id !== 'string' || typeof value.name !== 'string') throw new Error('Invalid camera view');
  const pose = normalizeCameraPose(value.pose);
  if (!pose || !value.id || !value.name.trim() || value.name.trim().length > 60 ||
    Math.hypot(...pose.position.map((v, i) => v - pose.target[i])) < 0.001) throw new Error('Invalid camera view');
  return { id: value.id, name: value.name.trim(), pose };
}
export function validateViews(value: unknown): SavedView[] {
  if (!Array.isArray(value) || value.length > 50) throw new Error('Invalid camera views');
  const views = value.map(validateView);
  if (new Set(views.map(v => v.id)).size !== views.length) throw new Error('Duplicate camera view');
  return views;
}
export async function readViews(workspace: string): Promise<SavedView[]> {
  const current = await get(workspace, drawingStore);
  if (current?.views !== undefined) return validateViews(current.views);
  const legacy = validateViews(await get(workspace, legacyStore) ?? []);
  // Retain the legacy database: migration never deletes the old copy.
  await update(workspace, current => ({ ...current, views: current?.views ?? legacy }), drawingStore);
  return validateViews((await get(workspace, drawingStore)).views);
}
export async function saveView(workspace: string, value: SavedView) {
  const view = validateView(value);
  await readViews(workspace);
  await update(workspace, current => {
    const views = validateViews(current?.views ?? []);
    if (views.length >= 50 && !views.some(v => v.id === view.id)) throw new Error('Camera view limit reached');
    return { ...current, views: [...views.filter(v => v.id !== view.id), view] };
  }, drawingStore);
  return readViews(workspace);
}
export async function deleteView(workspace: string, id: string) {
  await readViews(workspace);
  await update(workspace, current => ({ ...current, views: validateViews(current?.views ?? []).filter(v => v.id !== id) }), drawingStore);
  return readViews(workspace);
}
export function imageSize(longEdge: number, ratio: string) {
  if (![1280, 1920, 3840].includes(longEdge) || !['16:9', '9:16', '4:3', '1:1'].includes(ratio)) throw new Error('Invalid image size');
  const [w, h] = ratio.split(':').map(Number);
  return { w: Math.round(longEdge * w / Math.max(w, h)), h: Math.round(longEdge * h / Math.max(w, h)) };
}
