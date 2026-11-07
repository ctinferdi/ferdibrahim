import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveFloorFinishTarget } from '../apps/plan-editor/src/floor-finish-target.ts';

const nodes = {
  roomA: { id: 'roomA', type: 'zone' }, roomB: { id: 'roomB', type: 'zone' },
  floorA: { id: 'floorA', type: 'slab', zoneIds: ['roomA'] },
  floorB: { id: 'floorB', type: 'slab', zoneIds: ['roomB'] },
  standalone: { id: 'standalone', type: 'slab' },
  shared: { id: 'shared', type: 'slab', zoneIds: ['roomA', 'roomB'] },
  ...Object.fromEntries(['wall', 'door', 'window', 'item', 'column', 'block', 'ceiling'].map(type => [type, { id: type, type }])),
};

test('object and multi-selection never inherit floor controls from a retained room', () => {
  for (const selected of [['wall'], ['door'], ['window'], ['item'], ['column'], ['block'], ['ceiling'], ['missing'], ['wall', 'floorA'], ['floorA', 'floorB']]) {
    assert.equal(resolveFloorFinishTarget(nodes, selected, 'roomA', () => { throw new Error('Must not fall back to retained room'); }), null);
  }
});

test('selecting another floor targets its own zone, leaving the previous room untouched', () => {
  const before = JSON.stringify(nodes);
  const target = resolveFloorFinishTarget(nodes, ['floorB'], 'roomA', () => 'floorA');
  assert.equal(target.slab, nodes.floorB);
  assert.equal(target.zone, nodes.roomB);
  assert.equal(resolveFloorFinishTarget(nodes, ['standalone'], 'roomA', () => 'floorA').zone, null);
  assert.equal(JSON.stringify(nodes), before);
});

test('room-only selection and a shared floor resolve only a valid owning zone', () => {
  assert.deepEqual(resolveFloorFinishTarget(nodes, [], 'roomA', () => 'floorA'), { slab: nodes.floorA, zone: nodes.roomA });
  assert.equal(resolveFloorFinishTarget(nodes, ['shared'], 'roomB', () => null).zone, nodes.roomB);
  assert.equal(resolveFloorFinishTarget(nodes, ['shared'], 'missing', () => null).zone, null);
  assert.equal(resolveFloorFinishTarget(nodes, [], null, () => 'floorA'), null);
  assert.equal(resolveFloorFinishTarget(nodes, [], 'missing', () => 'floorA'), null);
});
