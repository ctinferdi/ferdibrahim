import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolveBundledAsset, adaptBundledAssets } from '../apps/plan-editor/asset-paths.mjs';
const root=fileURLToPath(new URL('../apps/plan-editor/public/',import.meta.url));
test('material previews and KTX2 references resolve to real bundled WebP textures',()=>{
  assert.match(resolveBundledAsset('/material/wood/finewood_27/finewood_27_thumb.webp',root),/basecolor\.webp$/);
  assert.match(resolveBundledAsset('/material/wood/finewood_27/finewood_27_ao_512.ktx2',root),/ambientocclusion\.webp$/);
  const source=readFileSync(new URL('../apps/plan-editor/node_modules/@pascal-app/core/dist/material-library.js',import.meta.url),'utf8');
  const output=adaptBundledAssets(source,root);
  const paths=[...output.matchAll(/['"](\/plan-editor\/material\/[^'"]+)['"]/g)].map(m=>m[1]);
  assert.ok(paths.length>100);
  for(const path of paths)assert.ok(existsSync(root+path.replace('/plan-editor/','')),path);
  // A few textures are already included as KTX2 and may keep that format.
  // Every emitted path above must exist, regardless of its image format.
});
test('furniture uses bundled models and hides unavailable external catalog entries',()=>{
  const source=readFileSync(new URL('../apps/plan-editor/vendor/editor/src/components/ui/item-catalog/catalog-items.tsx',import.meta.url),'utf8');
  const output=adaptBundledAssets(source,root);
  assert.equal(output.includes('byrpxoiotywskoojsrzd.supabase.co'),false);
  const paths=[...output.matchAll(/['"](\/plan-editor\/items\/[^'"]+)['"]/g)].map(m=>m[1]);
  assert.ok(paths.filter(p=>p.endsWith('.glb')).length>=100);
  for(const path of paths)assert.ok(existsSync(root+path.replace('/plan-editor/','')),path);
  assert.equal(resolveBundledAsset('/material/../../secret',root),undefined);
  assert.equal(resolveBundledAsset('https://example.com/photo.png',root),null);
});
