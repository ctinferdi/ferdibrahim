// Reject malformed backups before handing them to the scene engine.
export function parseBackup(text: string) {
  const payload = JSON.parse(text);
  if (payload?.format !== 'insaat-pascal' || payload?.version !== 1) throw new Error('Bu dosya bir Kat Planı JSON yedeği değil.');
  const scene = payload.scene;
  if (!scene || typeof scene.nodes !== 'object' || Array.isArray(scene.nodes) || !scene.nodes ||
      !Array.isArray(scene.rootNodeIds) || scene.rootNodeIds.length === 0 ||
      !scene.rootNodeIds.every((id: unknown) => typeof id === 'string' && Object.hasOwn(scene.nodes, id))) {
    throw new Error('Yedekteki çizim yapısı geçersiz.');
  }
  if (Object.keys(scene.nodes).length > 50000) throw new Error('Yedek çok büyük.');
  for (const [id, node] of Object.entries(scene.nodes)) {
    if (id === '__proto__' || id === 'constructor' || !node || typeof node !== 'object' ||
        (node as any).id !== id || typeof (node as any).type !== 'string') throw new Error('Yedekte geçersiz nesne var.');
  }
  return scene;
}
