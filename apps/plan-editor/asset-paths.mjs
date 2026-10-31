import { existsSync, readdirSync } from 'node:fs';
import { dirname, basename, extname, join } from 'node:path';

// The archive contains WebP textures and local GLBs; the published catalog
// references generated KTX2/thumbnail files and the upstream cloud storage.
export function resolveBundledAsset(url, publicRoot) {
  let path = url;
  const remote = url.match(/^https:\/\/byrpxoiotywskoojsrzd\.supabase\.co\/storage\/v1\/object\/public\/items\/(?:system\/([^/]+)|users\/[^/]+\/([^/]+))\/(.+)$/);
  if (remote) path = `/items/${remote[1] ?? remote[2]}/${remote[3].includes('models/') ? 'model.glb' : remote[3]}`;
  if (!path.startsWith('/material/') && !remote) return null;
  if (path.includes('..')) return undefined;
  const file = join(publicRoot, path.slice(1));
  if (existsSync(file)) return `/plan-editor${path}`;
  const folder = dirname(file);
  if (!existsSync(folder)) return undefined;
  const files = readdirSync(folder).sort();
  const name = basename(path), stem = name.replace(/_\d+\.(ktx2|webp)$/i, '').replace(/\.[^.]+$/, '');
  const exact = files.find(f => f === `${stem}.webp` || f === `${stem}.png` || f === `${stem}.jpg`);
  if (exact) return `/plan-editor/${path.slice(1, path.lastIndexOf('/') + 1)}${exact}`;
  const role = /thumb|basecolor|albedo|diffuse/i.test(name) ? /basecolor|albedo|diffuse/i
    : /ambientocclusion|_ao/i.test(name) ? /ambientocclusion|[-_]ao\./i
    : /normal/i.test(name) ? /normal/i : /roughness/i.test(name) ? /roughness/i
    : /metallic|metalness/i.test(name) ? /metallic|metalness/i : null;
  const texture = role && files.find(f => role.test(f) && /\.(webp|png|jpg)$/i.test(f));
  if (texture) return `/plan-editor/${path.slice(1, path.lastIndexOf('/') + 1)}${texture}`;
  if (remote) {
    const candidate = /floor-plan/i.test(name) ? files.find(f => /^floor-plan\.(svg|png|webp)$/i.test(f))
      : files.find(f => extname(f) === extname(name) && /model|thumbnail|floor-plan/i.test(f));
    if (candidate) return `/plan-editor/items/${remote[1] ?? remote[2]}/${candidate}`;
  }
  return undefined;
}

export function adaptBundledAssets(code, publicRoot) {
  return code.replace(/(['"])(\/material\/[^'"\n]+|https:\/\/byrpxoiotywskoojsrzd\.supabase\.co\/storage\/v1\/object\/public\/items\/[^'"\n]+)\1/g, (match, quote, url) => {
    const resolved = resolveBundledAsset(url, publicRoot);
    return resolved === null ? match : resolved === undefined ? 'undefined' : `${quote}${resolved}${quote}`;
  });
}
