import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isPasswordLengthValid } from '../supabase/functions/_shared/passwordPolicy.ts';
import { parseBackup } from '../apps/plan-editor/src/backup.ts';
import { handleAIRequest } from '../server/aiEndpoint.ts';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../apps/plan-editor/package.json', import.meta.url));
require('fake-indexeddb/auto');

test('new passwords enforce 12–128 characters, without case conversion', () => {
  for (const size of [0, 6, 11, 129]) assert.equal(isPasswordLengthValid('a'.repeat(size)), false);
  for (const size of [12, 40, 128]) assert.equal(isPasswordLengthValid('a'.repeat(size)), true);
  assert.equal(isPasswordLengthValid('İıŞşAa123!_.'), true);
});
test('obsolete drawing AI cannot reach the provider', async () => {
  assert.equal((await handleAIRequest({ task: 'floor-plan' }, undefined, {})).status, 400);
});
test('scene backup keeps node data intact', () => {
  const scene = { nodes: { 'site-1': { id: 'site-1', type: 'site', name: 'Deneme' } }, rootNodeIds: ['site-1'] };
  assert.deepEqual(parseBackup(JSON.stringify({ format: 'insaat-pascal', version: 1, scene })), scene);
});
test('invalid, unrelated and broken-root backups cannot replace a drawing', () => {
  for (const text of ['bad json', '{}', '{"format":"insaat-pascal","version":2}',
    JSON.stringify({ format: 'insaat-pascal', version: 1, scene: { nodes: {}, rootNodeIds: ['missing'] } }),
    JSON.stringify({ format: 'insaat-pascal', version: 1, scene: { nodes: { s: { id:'other', type:'site' } }, rootNodeIds: ['s'] } })]) {
    assert.throws(() => parseBackup(text));
  }
});

test('drawing storage preserves data, rejects stale tabs and isolates projects', async () => {
  const tabA = await import('../apps/plan-editor/src/storage.ts?test-a');
  const tabB = await import('../apps/plan-editor/src/storage.ts?test-b');
  const scene = { nodes: Object.fromEntries(Array.from({ length: 6 }, (_, i) => [`n${i}`, { id: `n${i}`, type: 'wall' }])), rootNodeIds: ['n0'] };
  assert.equal(await tabA.readDrawing('user:project-a'), null);
  assert.equal(await tabB.readDrawing('user:project-a'), null);
  await tabA.saveDrawing('user:project-a', scene);
  await assert.rejects(tabB.saveDrawing('user:project-a', { nodes: {}, rootNodeIds: [] }), /another tab/);
  await assert.rejects(tabA.saveDrawing('user:project-a', { nodes: {}, rootNodeIds: [] }), /empty drawing/);
  assert.deepEqual(await tabB.readDrawing('user:project-a'), scene);
  const replacement = { nodes: { site: { id: 'site', type: 'site' } }, rootNodeIds: ['site'] };
  await tabA.replaceFromBackup('user:project-a', replacement);
  assert.deepEqual(await tabA.getImportBackup('user:project-a'), scene);
  assert.deepEqual(await tabA.readDrawing('user:project-a'), replacement);
  assert.equal(await tabB.readDrawing('user:project-b'), null);
  await tabB.saveDrawing('user:project-b', scene);
  assert.deepEqual(await tabA.readDrawing('user:project-a'), replacement);
});
