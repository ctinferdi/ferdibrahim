import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import items from '../apps/plan-editor/src/kenney-catalog.json' with { type: 'json' };
import { translateLabel } from '../apps/plan-editor/src/translations.ts';
import { matchesCatalogSearch } from '../apps/plan-editor/vendor/editor/src/lib/catalog-search.ts';

test('all 120 CC0 models are self-contained GLBs with real previews and finite placement dimensions', () => {
  assert.equal(items.length, 120);
  assert.equal(new Set(items.map(i => i.id)).size, items.length);
  for (const item of items) {
    const root = new URL('../apps/plan-editor/public/', import.meta.url);
    const file = readFileSync(new URL(item.src.replace('/plan-editor/', ''), root));
    assert.equal(file.readUInt32LE(0), 0x46546c67, item.id);
    assert.equal(file.readUInt32LE(8), file.length, item.id);
    const gltf = JSON.parse(file.subarray(20, 20 + file.readUInt32LE(12)));
    assert.ok(gltf.meshes.length > 0, item.id);
    for (const resource of [...gltf.buffers, ...(gltf.images ?? [])]) assert.ok(!resource.uri || resource.uri.startsWith('data:'), item.id);
    assert.ok(item.dimensions.every(v => Number.isFinite(v) && v > 0 && v < 20), item.id);
    assert.ok(item.offset.every(Number.isFinite), item.id);
    assert.deepEqual(item.scale, [2, 2, 2]);
    const preview = readFileSync(new URL(item.thumbnail.replace('/plan-editor/', ''), root));
    assert.equal(preview.toString('ascii', 8, 12), 'WEBP', item.id);
    assert.equal(translateLabel(item.name, 'tr'), item.nameTr);
    assert.equal(translateLabel(item.nameTr, 'en'), item.name);
    assert.ok(matchesCatalogSearch(item, item.nameTr.replace(' · Kenney', '')), item.id);
  }
});
