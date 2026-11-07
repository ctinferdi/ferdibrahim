import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { loadConfigFromFile } from '../apps/plan-editor/node_modules/vite/dist/node/index.js';

test('personal GLB references survive node validation without allowing executable URL schemes', async () => {
  const loaded = await loadConfigFromFile({ command: 'build', mode: 'production' }, resolve('apps/plan-editor/vite.config.ts'));
  const plugin = loaded.config.plugins.find(p => p.name === 'pascal-local-assets');
  const path = resolve('apps/plan-editor/node_modules/@pascal-app/core/dist/schema/asset-url.js');
  let code = plugin.transform(await readFile(path, 'utf8'), path);
  code = code.replace("from 'zod'", `from '${pathToFileURL(resolve('apps/plan-editor/node_modules/zod/index.js')).href}'`);
  const { AssetUrl } = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
  assert.equal(AssetUrl.safeParse('data:model/gltf-binary;base64,Z2xURg==').success, true);
  for (const bad of ['data:text/html;base64,PHNjcmlwdD4=', 'javascript:alert(1)', 'file:///private', 'data:model/gltf-binary;base64,???']) assert.equal(AssetUrl.safeParse(bad).success, false);
  const resolverPath = resolve('apps/plan-editor/node_modules/@pascal-app/viewer/dist/lib/asset-url.js');
  let resolver = plugin.transform(await readFile(resolverPath, 'utf8'), resolverPath).replace(/import .*?from '@pascal-app\/core';/, 'const loadAssetUrl = () => null, resolveArtifactUrl = () => null;');
  const { resolveCdnUrl } = await import('data:text/javascript;base64,' + Buffer.from(resolver).toString('base64'));
  const model = 'data:model/gltf-binary;base64,Z2xURg==', image = 'data:image/png;base64,aGVsbG8=';
  assert.equal(resolveCdnUrl(model), model);
  assert.equal(resolveCdnUrl(image), image);
});
