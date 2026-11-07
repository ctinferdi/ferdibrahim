import React, { useEffect, useState } from 'react';
import { useEditor } from '@pascal-app/editor';
import { useScene, getWallEffectiveHeightForNodes, assemblyThickness, wallAssemblyPatch } from '@pascal-app/core';
import { useViewer } from '@pascal-app/viewer';
import { useInspectorDock } from '../vendor/editor/src/lib/inspector-dock';
import { beamBounds, resizeBeam } from './beam-resize';
import { resizeFurnitureAxis } from './furniture-size';
import { SelectionPopover } from './wall-measure-popover';
import { FloorFinishPicker, useFloorFinishTarget } from './floor-finish-picker';

// Keep unfinished input (e.g. an empty field) local, but apply valid dimensions
// immediately without remounting the focused input on every scene update.
function DimensionInput({ label, value, max, disabled, onCommit }: {
  label: string; value: number; max: number; disabled: boolean; onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  const valid = draft.trim() !== '' && Number.isFinite(Number(draft)) && Number(draft) >= 1 && Number(draft) <= max;
  return <label>{label}<input type="number" min="1" max={max} step="0.5" disabled={disabled}
    value={draft} aria-invalid={!valid} onChange={e => {
      setDraft(e.target.value);
      const next = e.target.valueAsNumber;
      if (Number.isFinite(next) && next >= 1 && next <= max && next !== value) onCommit(next);
    }} onBlur={() => { if (!valid) setDraft(String(value)); }}
    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }} />
  </label>;
}

export function SelectionProperties() {
  const id = useViewer(s => s.selection.selectedIds.length === 1 ? s.selection.selectedIds[0] : null);
  const node = useScene(s => id ? s.nodes[id] : null) as any;
  const readOnly = useScene(s => s.readOnly);
  const tool = useEditor(s => s.tool);
  const roomId = useEditor(s => s.room?.zoneId ?? null);
  const floorTarget = useFloorFinishTarget();
  const [roomDetails, setRoomDetails] = useState(false);
  const setDock = useInspectorDock(s => s.setElement);
  const setActions = useInspectorDock(s => s.setActions);
  const revealedNode = useInspectorDock(s => s.revealedNode);
  const revealNode = useInspectorDock(s => s.revealNode);
  useEffect(() => { revealNode(null); }, [id, revealNode]);
  useEffect(() => { setRoomDetails(false); }, [roomId]);
  const showProperties = id ? revealedNode === id : roomDetails;
  const structural = node && ['wall', 'column', 'block', 'item'].includes(node.type);
  const update = (patch: any) => {
    if (!readOnly && node) useScene.getState().updateNode(node.id, patch);
  };
  const beam = node?.type === 'block' && node.metadata?.insaatKind === 'beam';
  const wallHeight = useScene(s => node?.type === 'wall' ? getWallEffectiveHeightForNodes(node, s.nodes) : 0);
  const wallThicknessCm = node?.type === 'wall' ? Number(((node.assembly ? assemblyThickness(node.assembly) : node.thickness ?? 0.1) * 100).toFixed(2)) : 0;
  const setWallThickness = (cm: number) => {
    if (!Number.isFinite(cm) || cm < 1 || cm > 100) return;
    if (node.assembly && assemblyThickness(node.assembly) > 0) {
      const ratio = cm / 100 / assemblyThickness(node.assembly);
      update(wallAssemblyPatch({ ...node.assembly, layers: node.assembly.layers.map((layer: any) => ({ ...layer, thickness: layer.thickness * ratio })) }));
    } else update({ thickness: cm / 100 });
  };
  return <section className="selection-properties">
    <div ref={setActions} className="building-action-dock" />
    <SelectionPopover id={id ?? floorTarget?.slab.id ?? roomId} enabled={!tool && !!(id || roomId)}>
    <FloorFinishPicker />
    {node?.type === 'wall' && !tool && <div className="structural-options selected-wall-measures" key={node.id}>
      <h3>Seçili duvar</h3>
      <p data-i18n-skip>{node.name || 'Duvar'}</p>
      <div className="structural-size-row">
        <DimensionInput label="Duvar kalınlığı (cm)" value={wallThicknessCm} max={100} disabled={readOnly} onCommit={setWallThickness} />
        <DimensionInput label="Duvar yüksekliği (cm)" value={Number((wallHeight * 100).toFixed(1))} max={2000} disabled={readOnly} onCommit={cm => update({ height: cm / 100 })} />
      </div>
      <label>Hazır kalınlık<select disabled={readOnly} value={[10, 15, 20, 25, 30, 40].includes(wallThicknessCm) ? String(wallThicknessCm) : ''} onChange={e => { if (e.target.value) setWallThickness(Number(e.target.value)); }}>
        <option value="">Özel kalınlık</option>
        {[10, 15, 20, 25, 30, 40].map(cm => <option key={cm} value={cm}>{cm} cm</option>)}
      </select></label>
    </div>}
    {!tool && (node || roomId) && <button className="selection-properties-toggle" type="button" aria-expanded={showProperties}
      onClick={() => id ? revealNode(showProperties ? null : id) : setRoomDetails(!roomDetails)}>
      {showProperties ? 'Özellikleri gizle' : 'Özellikleri göster'}
    </button>}
    {structural && showProperties && <div className="structural-options" key={node.id}>
      <label>Eleman adı<input disabled={readOnly} defaultValue={node.name ?? ''} onBlur={e => {
        const name = e.target.value.trim(); if (name && name !== node.name) update({ name });
      }} /></label>
      {node.type === 'item' && node.asset?.dimensions?.map((base: number, axis: number) => {
        if (!(base > 0)) return null;
        const cm = Math.abs(base * (node.scale?.[axis] ?? 1)) * 100;
        const resize = (value: number) => {
          const scale = resizeFurnitureAxis(node.asset.dimensions, node.scale, axis, value);
          if (scale) update({ scale });
        };
        return <label key={axis}>{['Mobilya eni (cm)', 'Mobilya yüksekliği (cm)', 'Mobilya derinliği (cm)'][axis]}
          <input type="number" min="1" max="2000" step="1" disabled={readOnly} key={cm} defaultValue={Number(cm.toFixed(1))} onBlur={e => resize(e.target.valueAsNumber)} />
          <input aria-label={['Eni sürükleyerek değiştir', 'Yüksekliği sürükleyerek değiştir', 'Derinliği sürükleyerek değiştir'][axis]} type="range" min="1" max={Math.max(500, Math.ceil(cm))} step="1" disabled={readOnly} value={cm} onChange={e => resize(e.target.valueAsNumber)} />
        </label>;
      })}
      {node.type === 'wall' && <label>Duvar yüzeyi<select disabled={readOnly} value={node.slots?.a === node.slots?.b ? node.slots?.a ?? '' : ''} onChange={e => {
        if (e.target.value) update({ slots: { ...node.slots, a: e.target.value, b: e.target.value } });
      }}>
        <option value="">Mevcut / özel yüzey</option>
        <option value="library:flooring-rusticbrick">Tuğla</option>
        <option value="library:concrete-raw">Beton</option>
        <option value="library:concrete-drywall">Sıva</option>
      </select></label>}
      {beam && beamBounds(node.topology).map((bound, axis) => <label key={axis}>
        {['Kiriş uzunluğu (m)', 'Kiriş yüksekliği (m)', 'Kiriş eni (m)'][axis]}
        <input key={`${node.id}-${axis}-${bound.max - bound.min}`} type="number" min="0.05" max="200" step="0.01" disabled={readOnly}
          defaultValue={Number((bound.max - bound.min).toFixed(3))}
          onBlur={e => {
            const topology = resizeBeam(node.topology, axis, e.target.valueAsNumber);
            if (topology) update({ topology });
            else e.target.value = String(Number((bound.max - bound.min).toFixed(3)));
          }} />
      </label>)}
    </div>}
    <div ref={setDock} className="building-inspector-dock" hidden={!showProperties || !!tool} />
    </SelectionPopover>
  </section>;
}
