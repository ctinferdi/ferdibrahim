import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DoorNode, WallNode, SlabNode } from '../apps/plan-editor/node_modules/@pascal-app/core/dist/index.js';
import { buildingPresets, initialBuildingMeasures, buildingPresetDefaults } from '../apps/plan-editor/src/building-presets.ts';
import { parseBackup } from '../apps/plan-editor/src/backup.ts';
import { resolveFloorFinishTarget } from '../apps/plan-editor/src/floor-finish-target.ts';
import { adaptDoorDefaults } from '../apps/plan-editor/door-defaults.mjs';
import { adaptBuildingPlacement } from '../apps/plan-editor/building-placement.mjs';

test('five building presets create native nodes with metre dimensions and survive backup', () => {
  const nodes = {};
  for (const preset of buildingPresets) {
    const defaults = buildingPresetDefaults(preset.id, initialBuildingMeasures(preset.id));
    const node = preset.kind === 'wall' ? WallNode.parse({ ...defaults, start: [0, 0], end: [4, 0] })
      : preset.kind === 'slab' ? SlabNode.parse({ ...defaults, polygon: [[0,0], [4,0], [4,3], [0,3]] }) : DoorNode.parse(defaults);
    nodes[node.id] = node;
    assert.equal(node.metadata.insaatKind, preset.id);
    if (preset.id === 'lift-wall') { assert.equal(node.thickness, .25); assert.equal(node.height, 3); }
    if (preset.id === 'foundation') assert.equal(node.thickness, .5);
    if (preset.id === 'terrain') { assert.equal(node.elevation, -.05); assert.equal(node.slots.surface, '#71834b'); }
    if (preset.id === 'lift-door') { assert.equal(node.doorType, 'sliding'); assert.equal(node.leafCount, 2); assert.equal(node.width, 1); assert.equal(node.handle, false); }
    if (preset.id === 'fire-door') { assert.equal(node.panicBar, true); assert.equal(node.doorCloser, true); assert.equal(node.swingDirection, 'outward'); }
  }
  const scene = { nodes, rootNodeIds: Object.keys(nodes) };
  assert.deepEqual(parseBackup(JSON.stringify({ format: 'insaat-pascal', version: 1, scene })), scene);
});

test('invalid measurements are rejected and changing one preset leaves others unchanged', () => {
  for (const preset of buildingPresets) {
    const size = initialBuildingMeasures(preset.id), original = JSON.stringify(size);
    const key = preset.kind === 'door' ? 'width' : 'thickness';
    for (const bad of [NaN, Infinity, -1, 0, 10000]) assert.equal(buildingPresetDefaults(preset.id, { ...size, [key]: bad }), null);
    buildingPresetDefaults(preset.id, size);
    assert.equal(JSON.stringify(size), original);
  }
  const fire = buildingPresetDefaults('fire-door', { ...initialBuildingMeasures('fire-door'), leaves: 2 });
  assert.equal(fire.doorType, 'double');
});

test('terrain and foundation cannot accidentally receive the room parquet picker', () => {
  for (const insaatKind of ['terrain', 'foundation']) {
    const node = { id: 'surface', type: 'slab', metadata: { insaatKind } };
    const nodes = { surface: node, room: { id: 'room', type: 'zone' } };
    assert.equal(resolveFloorFinishTarget(nodes, ['surface'], 'room', () => 'surface'), null);
    assert.equal(resolveFloorFinishTarget(nodes, [], 'room', () => 'surface'), null);
  }
});

test('preset elevation ignores pointer support height while ordinary floors retain native placement', async () => {
  const source = readFileSync(new URL('../apps/plan-editor/node_modules/@pascal-app/core/dist/systems/slab/slab-placement.js', import.meta.url), 'utf8');
  const adapted = adaptBuildingPlacement(source, 'elevation');
  const { resolveSlabPlacementElevation } = await import('data:text/javascript;base64,' + Buffer.from(adapted).toString('base64'));
  assert.equal(resolveSlabPlacementElevation({ elevation: -.2, metadata: { insaatKind: 'terrain' } }, 3), -.2);
  assert.equal(resolveSlabPlacementElevation({ elevation: 0, metadata: { insaatKind: 'foundation' } }, 3), 0);
  assert.equal(resolveSlabPlacementElevation({ elevation: .2 }, 3), 3.2);
});

test('pinned door preview and both commit paths preserve preset identity and finish', () => {
  const source = readFileSync(new URL('../apps/plan-editor/node_modules/@pascal-app/nodes/dist/door/tool.js', import.meta.url), 'utf8');
  const adapted = adaptDoorDefaults(source);
  assert.equal((adapted.match(/metadata: useEditor.getState\(\).toolDefaults.door\?\.metadata/g) ?? []).length, 2);
  assert.ok(adapted.includes('...placedDoorFields(), ...useEditor.getState().toolDefaults.door'));
  assert.ok(adapted.includes('}, [doorDefaults]);'));
  assert.throws(() => adaptDoorDefaults('upstream changed'), /adapter needs updating/);
});

test('below-grade terrain cuts the fallback ground only on the lowest visible storey', async () => {
  const coreUrl = new URL('../apps/plan-editor/node_modules/@pascal-app/core/dist/index.js', import.meta.url).href;
  const source = readFileSync(new URL('../apps/plan-editor/node_modules/@pascal-app/nodes/dist/site/recessed-slab-ground-holes.js', import.meta.url), 'utf8');
  const adapted = adaptBuildingPlacement(source, 'ground').replace("'@pascal-app/core'", JSON.stringify(coreUrl));
  const { getRecessedSlabGroundHoles } = await import('data:text/javascript;base64,' + Buffer.from(adapted).toString('base64'));
  const terrain = SlabNode.parse({ ...buildingPresetDefaults('terrain', { ...initialBuildingMeasures('terrain'), elevation: -.2 }), polygon: [[0,0], [4,0], [4,3], [0,3]] });
  const ground = { id: 'level_ground', type: 'level', level: 0 };
  const upper = { id: 'level_upper', type: 'level', level: 1 };
  const scene = slab => ({ [ground.id]: ground, [upper.id]: upper, [slab.id]: slab });
  assert.equal(getRecessedSlabGroundHoles(scene({ ...terrain, parentId: ground.id })).length, 1);
  assert.equal(getRecessedSlabGroundHoles(scene({ ...terrain, parentId: upper.id })).length, 0);
  assert.equal(getRecessedSlabGroundHoles(scene({ ...terrain, parentId: ground.id, visible: false })).length, 0);
});
