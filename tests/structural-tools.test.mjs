import { test } from 'node:test';
import assert from 'node:assert/strict';
import { beamPlacement, resolveStructuralEnd, validateStructuralOptions } from '../apps/plan-editor/src/structural-model.ts';
import { createStructuralNode } from '../apps/plan-editor/src/structural-nodes.ts';
import { parseBackup } from '../apps/plan-editor/src/backup.ts';
const options = { label: 'K1', length: 5, fixedLength: true, width: 30, height: 50, elevation: 2.5 };

test('fixed beam length follows the drawing direction, with centimetres converted to metres', () => {
  const start = [2,3], end = resolveStructuralEnd(start,[5,7],options);
  assert.deepEqual(end,[5,7]);
  const beam = beamPlacement(start,end,options);
  assert.equal(beam.length,5); assert.equal(beam.width,0.3); assert.equal(beam.height,0.5);
  assert.deepEqual(beam.position,[3.5,2.5,5]);
  const x = Math.cos(beam.rotation)*beam.length, z = -Math.sin(beam.rotation)*beam.length;
  assert.ok(Math.abs(x-3)<1e-9 && Math.abs(z-4)<1e-9);
  assert.deepEqual(resolveStructuralEnd([0,0],[1,0],options),[5,0]);
});
test('free lengths and invalid dimensions cannot create zero or non-finite geometry', () => {
  assert.deepEqual(resolveStructuralEnd([0,0],[3,4],{...options,fixedLength:false}),[3,4]);
  assert.equal(resolveStructuralEnd([0,0],[0,0],options),null);
  assert.equal(resolveStructuralEnd([0,0],[201,0],{...options,fixedLength:false}),null);
  for(const patch of [{width:NaN},{width:-1},{height:0},{elevation:Infinity},{length:0},{label:''}]) {
    const bad={...options,...patch}; assert.equal(validateStructuralOptions(bad),false);
    assert.throws(()=>createStructuralNode(false,'K1',[0,0],[5,0],bad));
  }
});
test('native beam and axis nodes retain exact geometry, labels and identity through JSON backup', () => {
  const beam=createStructuralNode(false,'K1',[0,0],[5,0],options);
  const axis=createStructuralNode(true,'A',[0,0],[0,10],options);
  const nodes={[beam.id]:beam,[axis.id]:axis};
  const scene={nodes,rootNodeIds:[beam.id,axis.id]};
  const restored=parseBackup(JSON.stringify({format:'insaat-pascal',version:1,scene}));
  assert.deepEqual(restored,scene);
  assert.equal(beam.metadata.insaatKind,'beam'); assert.equal(axis.label,'A');
  for(const [index,size] of [[0,5],[1,0.5],[2,0.3]]) {
    const coordinates=beam.topology.vertices.map(v=>v.position[index]);
    assert.ok(Math.abs(Math.max(...coordinates)-Math.min(...coordinates)-size)<1e-9);
  }
});
