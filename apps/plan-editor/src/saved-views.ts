import { createStore, get, update } from 'idb-keyval';
import type { CameraPose } from '@pascal-app/core';
import { normalizeCameraPose } from '../vendor/editor/src/lib/camera-pose.ts';

const store = createStore('insaat-pascal-views', 'views');
export type SavedView = { id: string; name: string; pose: CameraPose };
export function validateView(value: SavedView): SavedView {
  const pose = normalizeCameraPose(value.pose);
  if (!pose || !value.id || !value.name.trim() || value.name.trim().length > 60 ||
    Math.hypot(...pose.position.map((v, i) => v - pose.target[i])) < 0.001) throw new Error('Invalid camera view');
  return { id: value.id, name: value.name.trim(), pose };
}
export async function readViews(workspace: string): Promise<SavedView[]> {
  return (await get<SavedView[]>(workspace, store) ?? []).map(validateView);
}
export async function saveView(workspace: string, value: SavedView) {
  const view = validateView(value);
  await update<SavedView[]>(workspace, current => {
    const views = current ?? [];
    if (views.length >= 50 && !views.some(v => v.id === view.id)) throw new Error('Camera view limit reached');
    return [...views.filter(v => v.id !== view.id), view];
  }, store);
  return readViews(workspace);
}
export async function deleteView(workspace: string, id: string) {
  await update<SavedView[]>(workspace, current => (current ?? []).filter(v => v.id !== id), store);
  return readViews(workspace);
}
export function imageSize(longEdge: number, ratio: string) {
  if (![1280, 1920, 3840].includes(longEdge) || !['16:9', '9:16', '4:3', '1:1'].includes(ratio)) throw new Error('Invalid image size');
  const [w, h] = ratio.split(':').map(Number);
  return { w: Math.round(longEdge * w / Math.max(w, h)), h: Math.round(longEdge * h / Math.max(w, h)) };
}
