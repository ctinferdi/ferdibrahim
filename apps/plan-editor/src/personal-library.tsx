import React, { useEffect, useState } from 'react';
import type { AssetInput } from '@pascal-app/core';

const DB = 'personal-furniture-library-v1';
function placeholder() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d')!; ctx.fillStyle = '#334155'; ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 32px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('3D', 64, 76);
  return canvas.toDataURL('image/png');
}
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('items', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
async function records(action: 'read' | 'put' | 'delete', value?: any): Promise<AssetInput[]> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('items', action === 'read' ? 'readonly' : 'readwrite');
    const store = tx.objectStore('items');
    if (action === 'put') store.put(value);
    if (action === 'delete') store.delete(value);
    const request = store.getAll();
    tx.oncomplete = () => { db.close(); resolve(request.result.map(item => ({ ...item, thumbnail: item.thumbnail || placeholder() }))); };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
function dataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader(); reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error); reader.readAsDataURL(blob);
  });
}
async function makeAsset(file: File, name: string, width: number, depth: number): Promise<AssetInput> {
  if (!file.size || file.size > 10 * 1024 * 1024) throw new Error('Dosya en fazla 10 MB olabilir.');
  const image = /\.(png|jpe?g|webp)$/i.test(file.name);
  if (!image && !/\.(glb|gltf)$/i.test(file.name)) throw new Error('PNG, JPG, WebP, GLB veya gömülü GLTF seç.');
  const THREE = await import('three');
  const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
  let scene: any, thumbnail = '', floorPlanUrl: string | undefined;
  if (image) {
    const bitmap = await createImageBitmap(file);
    if (bitmap.width * bitmap.height > 16000000) { bitmap.close(); throw new Error('Görsel en fazla 16 megapiksel olabilir.'); }
    const canvas = document.createElement('canvas');
    const factor = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
    canvas.width = Math.max(1, Math.round(bitmap.width * factor)); canvas.height = Math.max(1, Math.round(bitmap.height * factor));
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
    thumbnail = floorPlanUrl = canvas.toDataURL('image/png');
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    scene = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshStandardMaterial({ map: texture, transparent: true, side: THREE.DoubleSide }));
    scene.rotation.x = -Math.PI / 2; scene.position.y = 0.005;
  } else {
    const buffer = await file.arrayBuffer();
    const view = new DataView(buffer);
    let json: any;
    if (/\.gltf$/i.test(file.name)) json = JSON.parse(new TextDecoder().decode(buffer));
    else {
      if (buffer.byteLength < 20 || view.getUint32(0, true) !== 0x46546c67 || view.getUint32(4, true) !== 2 || view.getUint32(12, true) > buffer.byteLength - 20) throw new Error('Geçersiz GLB dosyası.');
      json = JSON.parse(new TextDecoder().decode(buffer.slice(20, 20 + view.getUint32(12, true))));
    }
    if ([...(json.buffers ?? []), ...(json.images ?? [])].some((entry: any) => entry.uri && !entry.uri.startsWith('data:'))) throw new Error('Modelin dokuları ve dosyaları gömülü olmalı. GLB olarak dışa aktar.');
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const model = await new GLTFLoader().parseAsync(/\.gltf$/i.test(file.name) ? JSON.stringify(json) : buffer, '');
    scene = model.scene;
  }
  try {
    scene.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(scene), size = bounds.getSize(new THREE.Vector3()), center = bounds.getCenter(new THREE.Vector3());
    if (![size.x, size.y, size.z].every(Number.isFinite) || size.length() <= 0) throw new Error('Modelin ölçüleri geçersiz.');
    const binary = await new GLTFExporter().parseAsync(scene, { binary: true, onlyVisible: false });
    if (!(binary instanceof ArrayBuffer) || binary.byteLength > 10 * 1024 * 1024) throw new Error('Dönüştürülen model en fazla 10 MB olabilir.');
    const src = await dataUrl(new Blob([binary], { type: 'model/gltf-binary' }));
    return { id: `personal-${crypto.randomUUID()}`, name, category: 'furniture', tags: ['Personal', 'Kişisel'], src, thumbnail: thumbnail || placeholder(), floorPlanUrl, dimensions: [size.x, Math.max(size.y, 0.01), size.z], offset: [-center.x, -bounds.min.y, -center.z], rotation: [0, 0, 0], scale: [1, 1, 1] };
  } finally {
    scene.traverse((object: any) => { object.geometry?.dispose(); for (const material of (Array.isArray(object.material) ? object.material : [object.material])) { if (material) { Object.values(material).forEach((v: any) => { if (v?.isTexture) v.dispose(); }); material.dispose(); } } });
  }
}
export function PersonalLibrary({ onChange }: { onChange: (items: AssetInput[]) => void }) {
  const [pending, setPending] = useState<string>(), [removed, setRemoved] = useState<AssetInput>();
  const [items, setItems] = useState<AssetInput[]>([]), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [name, setName] = useState(''), [file, setFile] = useState<File>(), [width, setWidth] = useState(1), [depth, setDepth] = useState(1);
  const update = (next: AssetInput[]) => { setItems(next); onChange(next); };
  useEffect(() => { records('read').then(update).catch(() => setMessage('Kütüphane açılamadı. Tarayıcı depolama izinlerini kontrol et.')); }, []);
  return <details className="personal-library"><summary>Kendi kütüphanem · Ekle / Sil</summary>
    <p>Bu tarayıcıda saklanır. PNG/JPG/WebP düz görsel, GLB/GLTF üç boyutlu model olarak eklenir.</p>
    <form onSubmit={async e => { e.preventDefault(); if (!file || busy) return; setBusy(true); setMessage(''); try { const asset = await makeAsset(file, name.trim() || file.name.replace(/\.[^.]+$/, ''), width, depth); update(await records('put', asset)); setMessage('Kütüphaneye eklendi.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Dosya eklenemedi.'); } finally { setBusy(false); } }}>
      <label>Öğe adı<input value={name} maxLength={100} onChange={e => setName(e.target.value)} /></label>
      <label>Dosya<input type="file" required accept=".png,.jpg,.jpeg,.webp,.glb,.gltf" onChange={e => setFile(e.target.files?.[0])} /></label>
      <label>Görsel genişliği (m)<input type="number" min="0.01" max="100" step="0.01" required value={width} onChange={e => setWidth(Number(e.target.value))} /></label>
      <label>Görsel derinliği (m)<input type="number" min="0.01" max="100" step="0.01" required value={depth} onChange={e => setDepth(Number(e.target.value))} /></label>
      <button className="design-primary" disabled={busy}>{busy ? 'İşleniyor…' : 'Kütüphaneye ekle'}</button>
    </form>
    <div role="status">{message}</div>
    {removed && <button disabled={busy} onClick={async () => { setBusy(true); try { update(await records('put', removed)); setRemoved(undefined); } catch { setMessage('Öğe geri alınamadı.'); } finally { setBusy(false); } }}>Son silmeyi geri al</button>}
    {items.map(item => <div className="personal-library-row" key={item.id}><span data-i18n-skip>{item.name}</span>{pending === item.id ? <div><span>Kütüphaneden kaldırılsın mı?</span><button disabled={busy} onClick={async () => { setBusy(true); try { update(await records('delete', item.id)); setRemoved(item); setPending(undefined); } catch { setMessage('Öğe silinemedi.'); } finally { setBusy(false); } }}>Kaldır</button><button onClick={() => setPending(undefined)}>İptal</button></div> : <button disabled={busy} aria-label={`${item.name} sil`} onClick={() => setPending(item.id)}>Sil</button>}</div>)}
  </details>;
}
