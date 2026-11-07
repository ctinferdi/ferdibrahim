import React, { useState } from 'react';
import { useEditor, selectWallDrawVariant } from '@pascal-app/editor';
import { useScene } from '@pascal-app/core';
import { buildingPresets, buildingPresetDefaults, initialBuildingMeasures, type BuildingPreset, type BuildingMeasures } from './building-presets';

export function BuildingPresetControls({ onChoose }: { onChoose: () => void }) {
  const tool = useEditor(s => s.tool);
  const defaults = useEditor(s => s.toolDefaults);
  const readOnly = useScene(s => s.readOnly);
  const active = buildingPresets.find(p => p.kind === tool && defaults[p.kind]?.metadata?.insaatKind === p.id);
  const [sizes, setSizes] = useState(() => Object.fromEntries(buildingPresets.map(p => [p.id, initialBuildingMeasures(p.id)])) as Record<BuildingPreset, BuildingMeasures>);
  function choose(id: BuildingPreset) {
    const preset = buildingPresets.find(p => p.id === id)!;
    const value = buildingPresetDefaults(id, sizes[id]);
    if (!value || readOnly) return;
    onChoose();
    const editor = useEditor.getState();
    // Unmount a previous preset's live draft before changing its native defaults.
    editor.setTool(null);
    if (preset.kind === 'wall') selectWallDrawVariant('walls');
    editor.setPhase('building'); editor.setCatalogCategory(null);
    editor.setToolDefaults(preset.kind, value); editor.setMode('build'); editor.setTool(preset.kind);
  }
  function change(key: keyof BuildingMeasures, value: number | string) {
    if (!active) return;
    const size = { ...sizes[active.id], [key]: value };
    setSizes(old => ({ ...old, [active.id]: size }));
    const next = buildingPresetDefaults(active.id, size);
    if (next) useEditor.getState().setToolDefaults(active.kind, next);
  }
  const size = active ? sizes[active.id] : null;
  const field = (key: keyof BuildingMeasures, label: string, min: number, max: number, step = 1) => <label>{label}
    <input type="number" min={min} max={max} step={step} disabled={readOnly} value={Number.isFinite(size?.[key]) ? size![key] : ''}
      onChange={e => change(key, e.target.valueAsNumber)} />
  </label>;
  return <>
    <div className="grid grid-cols-2 gap-2 mt-2">{buildingPresets.map(p => <button type="button" key={p.id} disabled={readOnly}
      className={`rounded-lg border p-3 text-sm ${active?.id === p.id ? 'bg-blue-600 text-white' : 'hover:bg-accent'}`}
      onClick={() => choose(p.id)}>{p.label}</button>)}</div>
    {active && size && <div className="structural-options">
      <h3>{active.label} · Ölçüler</h3>
      {active.kind === 'wall' && <>{field('thickness', 'Perde kalınlığı (cm)', 5, 100)}{field('height', 'Perde yüksekliği (cm)', 50, 2000)}<p>Başlangıç ve bitiş noktalarını seç. Perde çizimi Esc ile durur.</p></>}
      {active.kind === 'door' && <>{field('width', 'Kapı eni (cm)', 40, 500)}{field('height', 'Kapı yüksekliği (cm)', 100, 500)}
        {active.id === 'fire-door' && <label>Kanat sayısı<select value={size.leaves} onChange={e => change('leaves', Number(e.target.value))}><option value={1}>Tek kanat</option><option value={2}>Çift kanat</option></select></label>}
        <p>{active.id === 'lift-door' ? 'Çift kanatlı sürgülü kapı. Duvarın veya perdenin üzerine yerleştir.' : 'Panik barlı, dışa açılan kapı. Duvarın veya perdenin üzerine yerleştir.'}</p>
      </>}
      {active.kind === 'slab' && <>{field('thickness', active.id === 'foundation' ? 'Temel kalınlığı (cm)' : 'Arazi derinliği (cm)', 2, 500)}
        {field('elevation', 'Üst kot (m)', -100, 100, 0.05)}
        {active.id === 'terrain' && <label>Arazi yüzeyi<select value={size.surface} onChange={e => change('surface', e.target.value)}><option value="#71834b">Çim</option><option value="#916b45">Toprak</option><option value="#92918a">Çakıl</option></select></label>}
        <p>{active.id === 'foundation' ? 'Temelin sınırlarını çiz; başlangıç noktasına dönerek kapat. Kalınlık üst kottan aşağı uzanır.' : 'Düz arazi sınırlarını çiz; başlangıç noktasına dönerek kapat. Üst kot seçili kata göredir.'}</p>
      </>}
      {!buildingPresetDefaults(active.id, size) && <p role="alert">Geçerli ölçüler girin.</p>}
    </div>}
  </>;
}
