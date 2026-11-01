import React, { useEffect, useRef, useState } from 'react';
import { emitter } from '@pascal-app/core';
import { useEditor } from '@pascal-app/editor';
import { cameraPoseStore } from '../vendor/editor/src/store/camera-pose-store';
import { visibleScene } from '../vendor/editor/src/store/view-layout';
import { deleteView, imageSize, readViews, saveView, type SavedView } from './saved-views';
import { uiText } from './language';

export function PresentationPanel() {
  const workspace = new URLSearchParams(location.search).get('workspace')!;
  const [views, setViews] = useState<SavedView[]>([]), [name, setName] = useState('');
  const [error, setError] = useState(''), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [edge, setEdge] = useState(1920), [ratio, setRatio] = useState('16:9'), [busy, setBusy] = useState(false);
  const [picture, setPicture] = useState<{ url: string; width: number; height: number; extension: string } | null>(null);
  const request = useRef<string | null>(null), timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const is3d = useEditor(s => ['3d', 'split'].includes(visibleScene(s) ?? ''));
  useEffect(() => {
    let mounted = true;
    readViews(workspace).then(value => { if (mounted) setViews(value); }).catch(() => { if (mounted) setError('Kamera açıları okunamadı.'); }).finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [workspace]);
  useEffect(() => {
    function finish() { request.current = null; if (timer.current) clearTimeout(timer.current); setBusy(false); }
    const success = (event: any) => {
      if (event.requestId !== request.current) return;
      finish(); setError('');
      setPicture({ url: URL.createObjectURL(event.blob), width: event.width, height: event.height, extension: event.blob.type === 'image/png' ? 'png' : event.blob.type === 'image/webp' ? 'webp' : 'jpg' });
    };
    const failure = (event: any) => { if (event.requestId === request.current) { finish(); setError('Görsel oluşturulamadı. Daha düşük çözünürlükle tekrar dene.'); } };
    emitter.on('snapshot:captured', success); emitter.on('snapshot:capture-failed', failure);
    return () => { emitter.off('snapshot:captured', success); emitter.off('snapshot:capture-failed', failure); request.current = null; if (timer.current) clearTimeout(timer.current); };
  }, []);
  useEffect(() => () => { if (picture) URL.revokeObjectURL(picture.url); }, [picture]);
  async function addView() {
    const pose = cameraPoseStore.getState().pose;
    if (!pose || !is3d || saving) return;
    setSaving(true); setError('');
    try { setViews(await saveView(workspace, { id: crypto.randomUUID(), name, pose })); setName(''); }
    catch { setError('Kamera açısı kaydedilemedi. En fazla 50 açı saklanabilir.'); }
    finally { setSaving(false); }
  }
  function capture() {
    const pose = cameraPoseStore.getState().pose;
    if (!pose || !is3d || request.current) return;
    const requestId = crypto.randomUUID(); request.current = requestId; setBusy(true); setError('');
    timer.current = setTimeout(() => { request.current = null; setBusy(false); setError('Görsel oluşturulamadı. Daha düşük çözünürlükle tekrar dene.'); }, 90000);
    emitter.emit('camera-controls:generate-thumbnail', {
      projectId: workspace, requestId, ephemeral: true, captureMode: 'standard', standardSize: imageSize(edge, ratio),
      ...(pose.projection === 'orthographic' ? { ortho: { position: pose.position, target: pose.target, viewWidth: pose.viewWidth ?? 20 } } : { perspective: { position: pose.position, target: pose.target, fov: pose.fov } }),
    });
  }
  return <div className="appearance-panel presentation-panel">
    <h2>Kamera ve görsel çıktı</h2>
    {!is3d && <button className="design-primary" onClick={() => { useEditor.getState().setTool(null); useEditor.getState().setMode('select'); useEditor.getState().showView('3d'); }}>3D görünümü aç</button>}
    {error && <p role="alert">{error}</p>}
    <form onSubmit={e => { e.preventDefault(); void addView(); }}>
      <label>Kamera açısı adı<input required maxLength={60} value={name} onChange={e => setName(e.target.value)} placeholder="Kamera açısı adı" /></label>
      <button className="design-primary" disabled={loading || saving || !is3d || !name.trim()}>Açıyı kaydet</button>
    </form>
    <div className="saved-camera-list">{views.map(view => <div key={view.id}>
      <button data-i18n-skip disabled={!is3d || busy} onClick={() => emitter.emit('camera-controls:apply-pose', view.pose)}>{view.name}</button>
      <button title="Kamera açısını kaldır" disabled={saving} onClick={async () => {
        if (!window.confirm(uiText('Bu kamera açısı kaldırılsın mı?'))) return;
        setSaving(true);
        try { setViews(await deleteView(workspace, view.id)); setError(''); } catch { setError('Kamera açısı kaldırılamadı.'); } finally { setSaving(false); }
      }}>×</button>
    </div>)}</div>
    <p>Kamera açıları bu cihazda, bu projeye özel saklanır. Çizim nesnelerini değiştirmez.</p>
    <label>Görsel oranı<select value={ratio} disabled={busy} onChange={e => setRatio(e.target.value)}>{['16:9','9:16','4:3','1:1'].map(value => <option key={value}>{value}</option>)}</select></label>
    <label>Çözünürlük<select value={edge} disabled={busy} onChange={e => setEdge(Number(e.target.value))}><option value={1280}>1280 px</option><option value={1920}>1920 px</option><option value={3840}>3840 px</option></select></label>
    <button className="design-primary" disabled={busy || !is3d} onClick={capture}>{busy ? 'Görsel hazırlanıyor…' : 'Görsel oluştur'}</button>
    <p>Güncel 3D görünümden görsel üretir. Yüksek çözünürlükte işlem süresi cihazına bağlıdır.</p>
    {picture && <figure><img src={picture.url} alt="Oluşturulan görsel" /><figcaption>{picture.width} × {picture.height} px</figcaption><a className="design-primary" href={picture.url} download={`plan-${picture.width}x${picture.height}.${picture.extension}`}>Görseli indir</a></figure>}
  </div>;
}
