import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { WallNode, SlabNode, area, containsPoint } from '../apps/plan-editor/node_modules/@pascal-app/core/dist/index.js';
import { terrainRegions, clipTerrainFloorplan } from '../apps/plan-editor/src/terrain-clipping.ts';
import { adaptBuildingPlacement } from '../apps/plan-editor/building-placement.mjs';

const rectangle = (x, y, w, h) => [[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
const wallsFor = points => points.map((start, i) => WallNode.parse({ start, end: points[(i+1)%points.length], thickness: .4, parentId: 'level_ground' }));
const terrain = polygon => SlabNode.parse({ polygon, parentId: 'level_ground', metadata: { insaatKind: 'terrain' } });
const context = children => ({ parent: { id: 'level_ground', type: 'level', children: children.map(n => n.id) }, siblings: children.filter(n => n.type === 'slab'), resolve: id => children.find(n => n.id === id) });

test('terrain is cut at exterior wall faces, not room centre lines; source data is untouched', () => {
  const t = terrain(rectangle(-2,-2,8,7)), walls = wallsFor(rectangle(0,0,4,3));
  const before = JSON.stringify([t,...walls]);
  const regions = terrainRegions(t, context([t,...walls]));
  assert.ok(Math.abs(area(regions) - (56 - 4.4*3.4)) < 1e-6);
  assert.equal(containsPoint(regions, [2,1]), false);
  assert.equal(containsPoint(regions, [4.1,1]), false);
  assert.equal(containsPoint(regions, [4.3,1]), true);
  assert.equal(JSON.stringify([t,...walls]), before);
});

test('partial overlap, split terrain, full coverage and existing holes remain valid', () => {
  const t = terrain(rectangle(0,0,10,10));
  const floor = SlabNode.parse({ polygon: rectangle(4,-2,2,14), parentId: t.parentId });
  const split = terrainRegions(t,context([t,floor]));
  assert.equal(split.length,2); assert.equal(area(split),80);
  const cover = { ...floor, polygon: rectangle(-1,-1,12,12) };
  assert.deepEqual(terrainRegions(t,context([t,cover])),[]);
  const holed = { ...t, holes: [rectangle(1,1,1,1)] };
  assert.equal(area(terrainRegions(holed,context([holed,floor]))),79);
});

test('concave buildings, curved walls and multiple footprints do not use a bounding box', () => {
  const t = terrain(rectangle(-5,-5,20,20));
  const l = wallsFor([[0,0],[4,0],[4,2],[2,2],[2,4],[0,4]]);
  let regions = terrainRegions(t,context([t,...l]));
  assert.equal(containsPoint(regions,[3,3]),true);
  assert.equal(containsPoint(regions,[1,3]),false);
  const curved = wallsFor(rectangle(6,0,4,3)); curved[0] = { ...curved[0], curveOffset: 1 };
  regions = terrainRegions(t,context([t,...l,...curved]));
  assert.equal(containsPoint(regions,[8,2]),false);
  assert.equal(containsPoint(regions,[5,2]),true);
  assert.ok(regions.flatMap(r=>r.holes).some(r=>r.length>8));
});

test('invisible objects and other levels are excluded; removing a building restores terrain', () => {
  const t = terrain(rectangle(-2,-2,8,7)), walls=wallsFor(rectangle(0,0,4,3));
  const ctx = context([t,...walls.map(w=>({...w,visible:false}))]);
  assert.equal(area(terrainRegions(t,ctx)),56);
  const elsewhere = wallsFor(rectangle(0,0,6,5));
  const onlyTerrain = context([t]);
  onlyTerrain.resolve = id => [t,...elsewhere].find(n=>n.id===id);
  assert.equal(area(terrainRegions(t,onlyTerrain)),56);
});

test('selection keeps raw handles but never paints a hatch across a cutout', () => {
  const t=terrain(rectangle(-2,-2,8,7)), walls=wallsFor(rectangle(0,0,4,3));
  const handle={kind:'endpoint-handle',point:[-2,-2]};
  const result=clipTerrainFloorplan({kind:'group',children:[{kind:'path',d:'old',fill:'green'},{kind:'hatch'},handle]},terrainRegions(t,context([t,...walls])));
  assert.equal(result.children.length,2);
  assert.equal(result.children[1],handle);
  assert.equal(result.children[0].fillRule,'evenodd');
  assert.equal((result.children[0].d.match(/M /g)??[]).length,2);
});

test('3D terrain is invalidated when an enclosed wall changes, is deleted or is undone', async () => {
  const core = new URL('../apps/plan-editor/node_modules/@pascal-app/core/dist/index.js',import.meta.url).href;
  const source=readFileSync(new URL('../apps/plan-editor/node_modules/@pascal-app/nodes/dist/slab/dependency-tracker.js',import.meta.url),'utf8');
  const patched=adaptBuildingPlacement(source,'terrain-dependencies').replace("'@pascal-app/core'",JSON.stringify(core));
  const {createSlabDependencyTracker}=await import('data:text/javascript;base64,'+Buffer.from(patched).toString('base64'));
  const t=terrain(rectangle(-20,-20,40,40)), walls=wallsFor(rectangle(0,0,4,3));
  const scene=children=>Object.fromEntries([{id:t.parentId,type:'level',level:0,children:children.map(n=>n.id)},...children].map(n=>[n.id,n]));
  const initial=scene([t,...walls]), update=createSlabDependencyTracker(initial);
  assert.deepEqual(update(initial),[]);
  const thicker=scene([t,...walls.map(w=>({...w,thickness:.8}))]);
  assert.ok(update(thicker).includes(t.id));
  assert.ok(update(scene([t])).includes(t.id));
  assert.ok(update(initial).includes(t.id));
  assert.ok(update(scene([t,...walls.map(w=>({...w,visible:false}))])).includes(t.id));
  assert.throws(()=>adaptBuildingPlacement('changed upstream','terrain-dependencies'));
});
