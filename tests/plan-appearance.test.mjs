import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decoratePlanGeometry } from '../apps/plan-editor/src/plan-appearance.ts';
import { resizeFurnitureAxis } from '../apps/plan-editor/src/furniture-size.ts';
import { adaptWallContinuation } from '../apps/plan-editor/wall-continuation.mjs';

test('furniture resize changes only the requested axis and preserves mirroring', () => {
  const original = [-1, 1, 1];
  const result = resizeFurnitureAxis([2, .74, 1.01], original, 0, 300);
  assert.deepEqual(result, [-1.5, 1, 1]);
  assert.deepEqual(original, [-1, 1, 1]);
  for (const cm of [0, -1, NaN, Infinity, 2001]) assert.equal(resizeFurnitureAxis([2, 1, 1], original, 0, cm), null);
});

test('wall thickness is edited numerically while endpoint handles remain available', () => {
  const geometry = { kind: 'group', children: [
    { kind: 'endpoint-handle', affordance: 'move-endpoint' },
    { kind: 'group', children: [{ kind: 'endpoint-handle', affordance: 'thickness' }] },
  ] };
  const result = decoratePlanGeometry('wall', {}, geometry, true);
  assert.equal(result.children[0], geometry.children[0]);
  assert.deepEqual(result.children[1].children, []);
  assert.equal(geometry.children[1].children.length, 1);
});

test('floor appearance preserves holes, handles and original document geometry', () => {
  const geometry = { kind: 'group', children: [{ kind: 'path', d: 'M0 0L5 0L5 5Z M1 1L2 1L2 2Z', fill: '#ccc' }, { kind: 'vertex-handle', point: [0, 0] }] };
  const before = JSON.stringify(geometry);
  const result = decoratePlanGeometry('slab', { slots: { surface: '#abcdef' } }, geometry, false);
  assert.equal(result.children[0].planSurface, '#abcdef');
  assert.equal(result.children[0].d, geometry.children[0].d);
  assert.equal(result.children[0].fillRule, 'evenodd');
  assert.equal(result.children[1], geometry.children[1]);
  assert.equal(JSON.stringify(geometry), before);
});

test('3D wall adapter preserves room closing detection except continuous drawing', () => {
  const source = readFileSync(new URL('../apps/plan-editor/node_modules/@pascal-app/nodes/dist/wall/tool.js', import.meta.url), 'utf8');
  assert.match(adaptWallContinuation(source), /getContinuation\('wall'\) !== 'continuous' && \(closedToChainStart/);
  assert.throws(() => adaptWallContinuation('changed upstream'), /review continuous/);
});
