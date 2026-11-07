import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { adaptColumnDefaults } from '../apps/plan-editor/column-defaults.mjs';

test('real placement tool applies dimensions to both preview and committed columns', async () => {
  const source = await readFile(new URL('../apps/plan-editor/node_modules/@pascal-app/nodes/dist/column/tool.js', import.meta.url), 'utf8');
  const patched = adaptColumnDefaults(source);
  const factory = patched.slice(patched.indexOf('function createColumnFromPreset'), patched.indexOf('/**'));
  const dimensions = { crossSection: 'rectangular', width: .35, depth: .65, height: 3.2 };
  const create = new Function('COLUMN_PRESETS', 'ColumnNode', 'useEditor', `${factory}; return createColumnFromPreset;`)(
    { basicPillar: { label: 'Column', width: .44, depth: .44, height: 2.5 } },
    { parse: value => value }, { getState: () => ({ toolDefaults: { column: dimensions } }) },
  );
  for (const position of [[0,0,0], [2,0,4]]) {
    const column = create('basicPillar', position);
    assert.equal(column.width, .35); assert.equal(column.depth, .65); assert.equal(column.height, 3.2);
    assert.deepEqual(column.position, position);
  }
  assert.match(patched, /\[columnDefaults\]/);
  assert.throws(() => adaptColumnDefaults('changed upstream'), /needs updating/);
});
