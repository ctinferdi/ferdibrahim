import React, { useCallback, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { loadPlugin } from '@pascal-app/core';
import { builtinPlugin } from '@pascal-app/nodes';
import { Editor, useEditor, selectWallDrawVariant, ViewerToolbarLeft, ViewerToolbarRight, type SceneGraph } from '@pascal-app/editor';
import { Hammer, Package, Layers, Settings, PaintBucket, Sun } from 'lucide-react';
import { readDrawing, saveDrawing, replaceFromBackup, getImportBackup } from './storage';
import { parseBackup } from './backup';
import './upstream.css';
import './shell.css';
import { defaultStructuralOptions, withStructuralTools } from './structural-tools';
import { validateStructuralOptions, type StructuralOptions } from './structural-model';
import { FurniturePanel, MaterialsPanel, AppearancePanel } from './design-panels';
import { LanguageBridge, LanguageSelector, uiText } from './language';

const params = new URLSearchParams(location.search);
const workspace = params.get('workspace');
const projectName = params.get('name') || 'Kat Planı';

const buildTools = [
  ['wall', 'Duvar'], ['door', 'Kapı'], ['window', 'Pencere'], ['slab', 'Döşeme'],
  ['ceiling', 'Tavan'], ['roof', 'Çatı'], ['stair', 'Merdiven'], ['column', 'Kolon'],
] as const;
function BuildPanel() {
  const tool = useEditor(s => s.tool);
  const [structural, setStructural] = useState<'axis' | 'beam' | null>(null);
  const [options, setOptions] = useState<StructuralOptions>(defaultStructuralOptions);
  function chooseStructural(kind: 'axis' | 'beam') {
    useEditor.getState().setTool(null);
    useEditor.getState().setMode('select');
    setStructural(kind);
    setOptions({ ...defaultStructuralOptions, label: kind === 'axis' ? 'A' : 'K1', length: kind === 'axis' ? 10 : 5 });
  }
  function activate(id: string, variant?: 'walls' | 'rectangle' | 'polygon') {
    setStructural(null);
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
    <button className={`rounded-lg border p-3 text-sm ${structural === 'axis' ? 'bg-blue-600 text-white' : 'hover:bg-accent'}`} onClick={() => chooseStructural('axis')}>Aks</button>
    <button className={`rounded-lg border p-3 text-sm ${structural === 'beam' ? 'bg-blue-600 text-white' : 'hover:bg-accent'}`} onClick={() => chooseStructural('beam')}>Kiriş</button>
  </div>
  {structural && <form className="structural-options" onSubmit={event => {
    event.preventDefault(); if (!validateStructuralOptions(options)) return;
    const editor = useEditor.getState(), kind = structural === 'axis' ? 'structural-grid' : 'block';
    editor.setPhase('building'); editor.setCatalogCategory(null); editor.setToolDefaults(kind, { ...options });
    editor.showView('2d'); editor.setMode('build'); editor.setTool(kind);
  }}>
    <h3>{structural === 'axis' ? 'Aks ölçüleri' : 'Kiriş ölçüleri'}</h3>
    <label>Ad / numara<input required maxLength={12} value={options.label} onChange={e => setOptions({ ...options, label: e.target.value })} /></label>
    <label className="structural-check"><input type="checkbox" checked={options.fixedLength} onChange={e => setOptions({ ...options, fixedLength: e.target.checked })} />Sabit uzunluk kullan</label>
    <label>Uzunluk (m)<input type="number" min="0.1" max="200" step="0.1" required disabled={!options.fixedLength} value={Number.isFinite(options.length) ? options.length : ''} onChange={e => setOptions({ ...options, length: e.target.valueAsNumber })} /></label>
    {structural === 'beam' && <>
      <div className="structural-size-row">
        <label>En (cm)<input type="number" min="5" max="300" required value={Number.isFinite(options.width) ? options.width : ''} onChange={e => setOptions({ ...options, width: e.target.valueAsNumber })} /></label>
        <label>Yükseklik (cm)<input type="number" min="5" max="300" required value={Number.isFinite(options.height) ? options.height : ''} onChange={e => setOptions({ ...options, height: e.target.valueAsNumber })} /></label>
      </div>
      <label>Alt kot — kat döşemesinden (m)<input type="number" min="-100" max="100" step="0.05" required value={Number.isFinite(options.elevation) ? options.elevation : ''} onChange={e => setOptions({ ...options, elevation: e.target.valueAsNumber })} /></label>
    </>}
    <button className="structural-start" type="submit" disabled={!validateStructuralOptions(options)}>Çizime başla</button>
    <p>2D'de başlangıç ve bitiş yönüne tıkla. {options.fixedLength ? 'Girilen uzunluk uygulanır.' : 'Uzunluk iki nokta arasından alınır.'} Değiştirdiğin ölçüleri uygulamak için Çizime başla'ya bas.</p>
  </form>}
  <p className="mt-4 text-xs text-muted-foreground">Aracı seçip çizim alanında çalış. Esc ile seçim moduna dön.</p></div>;
}
const tabs = [
  { id: 'build', label: 'Çizim', icon: <Hammer size={20} />, component: BuildPanel },
  { id: 'items', label: 'Mobilya', icon: <Package size={20} />, component: FurniturePanel },
  { id: 'paint', label: 'Malzemeler', icon: <PaintBucket size={20} />, component: MaterialsPanel },
  { id: 'appearance', label: '3D Görünüm', icon: <Sun size={20} />, component: AppearancePanel },
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
      if (!window.confirm(uiText('Bu projenin çizimi yedekteki çizimle değiştirilsin mi? Mevcut çizim geri almak için korunur.'))) return;
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
      if (!scene || !window.confirm(uiText('İçe aktarmadan önceki çizime dönülsün mü?'))) return;
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
    <LanguageBridge />
    {error && <div role="alert" className="save-error">{error}</div>}
    <input ref={fileInput} type="file" accept=".json,application/json" style={{display:'none'}} onChange={e => importFile(e.target.files?.[0])} />
    <Editor key={version} layoutVersion="v2" projectId={workspace!} projectName={projectName} sidebarTabs={tabs}
      onLoad={load} onSave={save} guardAgainstSceneWipe
      onSaveStatusChange={s => setStatus(({ idle: 'Hazır', pending: 'Değişiklik var', saving: 'Kaydediliyor…', saved: 'Bu cihazda kaydedildi', error: 'Kaydedilemedi', paused: 'Kayıt duraklatıldı' })[s])}
      navbarSlot={<div className="plan-navbar"><strong data-i18n-skip>{projectName}</strong><span role="status">{status}</span><LanguageSelector /><button onClick={exportFile}>JSON yedeği indir</button><button onClick={() => fileInput.current?.click()}>Yedeği aç</button>{hasBackup && <button onClick={undoImport}>İçe aktarmayı geri al</button>}</div>}
      viewerToolbarLeft={<ViewerToolbarLeft />} viewerToolbarRight={<ViewerToolbarRight />} />
  </div>;
}

const root = createRoot(document.getElementById('root')!);
if (!workspace || window.parent === window) {
  root.render(<div className="boot-message">Editörü uygulamadaki Kat Planı menüsünden açın.</div>);
} else {
  root.render(<div className="boot-message">Çizim araçları yükleniyor…</div>);
  loadPlugin(withStructuralTools(builtinPlugin)).then(() => root.render(<PlanApp />)).catch(error => {
    console.error('Editor bootstrap failed', error);
    root.render(<div className="boot-message" role="alert">Editör başlatılamadı. Sayfayı yenileyip tekrar deneyin.</div>);
  });
}
