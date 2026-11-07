import test from 'node:test';
import assert from 'node:assert/strict';
import { resizeBeam, beamBounds } from '../apps/plan-editor/src/beam-resize.ts';

test('beam resize retains topology and material references, anchors height to base', () => {
  const topology = { vertices: [
    { id: 'a', position: [-2, 0, -0.15] }, { id: 'b', position: [2, 0.5, 0.15] },
  ], faces: [{ id: 'face', materialSlot: 'concrete' }] };
  const snapshot = JSON.stringify(topology);
  const resized = resizeBeam(topology, 1, 0.8);
  assert.deepEqual(beamBounds(resized)[1], { min: 0, max: 0.8 });
  assert.equal(resized.faces, topology.faces);
  assert.equal(resized.vertices[0].id, 'a');
  assert.equal(JSON.stringify(topology), snapshot);
  assert.deepEqual(beamBounds(resizeBeam(topology, 0, 6))[0], { min: -3, max: 3 });
});
test('invalid beam sizes cannot alter geometry', () => {
  const topology = { vertices: [{ position: [0, 0, 0] }, { position: [1, 1, 1] }] };
  for (const size of [NaN, Infinity, 0, -2, 201]) assert.equal(resizeBeam(topology, 0, size), null);
  assert.equal(resizeBeam(topology, 3, 1), null);
});
