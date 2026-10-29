import React, { useCallback, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { loadPlugin } from '@pascal-app/core';
import { builtinPlugin } from '@pascal-app/nodes';
import { Editor, ItemsPanel, useEditor, selectWallDrawVariant, ViewerToolbarLeft, ViewerToolbarRight, type SceneGraph } from '@pascal-app/editor';
import { Hammer, Package, Layers, Settings } from 'lucide-react';
import { readDrawing, saveDrawing, replaceFromBackup, getImportBackup } from './storage';
import { parseBackup } from './backup';
import './upstream.css';
import './shell.css';

const params = new URLSearchParams(location.search);
const workspace = params.get('workspace');
const projectName = params.get('name') || 'Kat Planı';

const buildTools = [
  ['wall', 'Duvar'], ['door', 'Kapı'], ['window', 'Pencere'], ['slab', 'Döşeme'],
  ['ceiling', 'Tavan'], ['roof', 'Çatı'], ['stair', 'Merdiven'], ['column', 'Kolon'],
] as const;
function BuildPanel() {
  const tool = useEditor(s => s.tool);
  function activate(id: string, variant?: 'walls' | 'rectangle' | 'polygon') {
    const editor = useEditor.getState();
    if (variant) selectWallDrawVariant(variant);
    editor.setPhase('building'); editor.setCatalogCategory(null); editor.setToolDefaults(id, null); editor.setMode('build'); editor.setTool(id);
  }
  return <div className="p-3"><h2 className="mb-3 font-semibold">Yapı araçları</h2><div className="grid grid-cols-2 gap-2">
    {buildTools.map(([id, label]) => <button key={id} className={`rounded-lg border p-3 text-sm ${tool === id ? 'bg-blue-600 text-white' : 'hover:bg-accent'}`} onClick={() => {
      activate(id, id === 'wall' ? 'walls' : undefined);
    }}>{label}</button>)}
    <button className="rounded-lg border p-3 text-sm hover:bg-accent" onClick={() => activate('wall', 'rectangle')}>Dikdörtgen oda</button>
    <button className="rounded-lg border p-3 text-sm hover:bg-accent" onClick={() => activate('wall', 'polygon')}>Çokgen oda</button>
  </div><p className="mt-4 text-xs text-muted-foreground">Aracı seçip çizim alanında çalış. Esc ile seçim moduna dön.</p></div>;
}
const tabs = [
  { id: 'build', label: 'Çizim', icon: <Hammer size={20} />, component: BuildPanel },
  { id: 'items', label: 'Mobilya', icon: <Package size={20} />, component: () => <ItemsPanel showSourceFilter={false} showTagFilters={false} /> },
  { id: 'site', label: 'Katlar', icon: <Layers size={20} />, component: () => null },
  { id: 'settings', label: 'Ayarlar', icon: <Settings size={20} />, component: () => null },
];

function PlanApp() {
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Yükleniyor…');
  const [version, setVersion] = useState(0);
  const [hasBackup, setHasBackup] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const replacing = useRef(false);
  const load = useCallback(async () => {
    const scene = await readDrawing(workspace!);
    setHasBackup(Boolean(await getImportBackup(workspace!)));
    replacing.current = false;
    return scene;
  }, []);
  const save = useCallback(async (scene: SceneGraph) => {
    if (replacing.current) return;
    try { await saveDrawing(workspace!, scene); setError(''); }
    catch (e) { setError('Çizim kaydedilemedi. Alanı kontrol edip JSON yedeğini indir.'); throw e; }
  }, []);
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('Yedek en fazla 20 MB olabilir.');
      const scene = parseBackup(await file.text());
      if (!window.confirm('Bu projenin çizimi yedekteki çizimle değiştirilsin mi? Mevcut çizim geri almak için korunur.')) return;
      replacing.current = true;
      const { getSavedSceneDocument } = await import('../vendor/editor/src/lib/scene');
      await saveDrawing(workspace!, getSavedSceneDocument());
      await replaceFromBackup(workspace!, scene);
      setError(''); setVersion(v => v + 1);
    } catch (e) { replacing.current = false; setError(e instanceof Error ? e.message : 'Yedek açılamadı.'); }
    finally { if (fileInput.current) fileInput.current.value = ''; }
  }
  async function undoImport() {
    try {
      const scene = await getImportBackup(workspace!);
      if (!scene || !window.confirm('İçe aktarmadan önceki çizime dönülsün mü?')) return;
      replacing.current = true;
      await replaceFromBackup(workspace!, scene); setError(''); setVersion(v => v + 1);
    } catch { replacing.current = false; setError('Yedek geri alınamadı.'); }
  }
  async function exportFile() {
    // Export the current document, including any changes still waiting for autosave.
    const { getSavedSceneDocument } = await import('../vendor/editor/src/lib/scene');
    const scene = getSavedSceneDocument();
    const blob = new Blob([JSON.stringify({ format: 'insaat-pascal', version: 1, name: projectName, scene }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const a = document.createElement('a');
    a.href = url; a.download = `${projectName.replace(/[^\p{L}\p{N} -]/gu, '')}-plan.json`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <div className="editor-host">
    {error && <div role="alert" className="save-error">{error}</div>}
    <input ref={fileInput} type="file" accept=".json,application/json" style={{display:'none'}} onChange={e => importFile(e.target.files?.[0])} />
    <Editor key={version} layoutVersion="v2" projectId={workspace!} projectName={projectName} sidebarTabs={tabs}
      onLoad={load} onSave={save} guardAgainstSceneWipe
      onSaveStatusChange={s => setStatus(({ idle: 'Hazır', pending: 'Değişiklik var', saving: 'Kaydediliyor…', saved: 'Bu cihazda kaydedildi', error: 'Kaydedilemedi', paused: 'Kayıt duraklatıldı' })[s])}
      navbarSlot={<div className="plan-navbar"><strong>{projectName}</strong><span role="status">{status}</span><button onClick={exportFile}>JSON yedeği indir</button><button onClick={() => fileInput.current?.click()}>Yedeği aç</button>{hasBackup && <button onClick={undoImport}>İçe aktarmayı geri al</button>}</div>}
      viewerToolbarLeft={<ViewerToolbarLeft />} viewerToolbarRight={<ViewerToolbarRight />} />
  </div>;
}

const root = createRoot(document.getElementById('root')!);
if (!workspace || window.parent === window) {
  root.render(<div className="boot-message">Editörü uygulamadaki Kat Planı menüsünden açın.</div>);
} else {
  root.render(<div className="boot-message">Çizim araçları yükleniyor…</div>);
  loadPlugin(builtinPlugin).then(() => root.render(<PlanApp />)).catch(error => {
    console.error('Editor bootstrap failed', error);
    root.render(<div className="boot-message" role="alert">Editör başlatılamadı. Sayfayı yenileyip tekrar deneyin.</div>);
  });
}
