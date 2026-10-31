import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../apps/plan-editor/package.json', import.meta.url));
require('fake-indexeddb/auto');
const { imageSize, saveView, readViews, deleteView, validateView } = await import('../apps/plan-editor/src/saved-views.ts');
const pose = { projection:'perspective', position:[3,4,5], target:[0,0,0], fov:50 };
test('saved camera angles survive reload, stay isolated, and remove only the requested angle', async () => {
  await Promise.all([saveView('a',{id:'1',name:'Salon',pose}), saveView('a',{id:'2',name:'Mutfak',pose})]);
  assert.equal((await readViews('a')).length,2);
  assert.deepEqual(await readViews('b'),[]);
  const fresh = await import('../apps/plan-editor/src/saved-views.ts?reload');
  assert.equal((await fresh.readViews('a')).length,2);
  await deleteView('a','1');
  assert.deepEqual((await readViews('a')).map(v=>v.name),['Mutfak']);
  assert.deepEqual((await readViews('a'))[0].pose,pose);
});
test('camera data and output dimensions reject invalid values',()=>{
  for(const invalid of [{...pose,position:[NaN,1,2]},{...pose,target:pose.position},{...pose,projection:'bad'}]) assert.throws(()=>validateView({id:'x',name:'A',pose:invalid}));
  assert.throws(()=>validateView({id:'x',name:' ',pose}));
  assert.deepEqual(imageSize(3840,'16:9'),{w:3840,h:2160});
  assert.deepEqual(imageSize(1920,'9:16'),{w:1080,h:1920});
  assert.deepEqual(imageSize(1280,'1:1'),{w:1280,h:1280});
  assert.throws(()=>imageSize(Infinity,'16:9'));
  assert.throws(()=>imageSize(3840,'0:0'));
});
