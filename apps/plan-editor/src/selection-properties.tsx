import React from 'react';
import { useScene } from '@pascal-app/core';
import { useViewer } from '@pascal-app/viewer';
import { useInspectorDock } from '../vendor/editor/src/lib/inspector-dock';
import { beamBounds, resizeBeam } from './beam-resize';

export function SelectionProperties() {
  const id = useViewer(s => s.selection.selectedIds.length === 1 ? s.selection.selectedIds[0] : null);
  const node = useScene(s => id ? s.nodes[id] : null) as any;
  const readOnly = useScene(s => s.readOnly);
  const setDock = useInspectorDock(s => s.setElement);
  const setActions = useInspectorDock(s => s.setActions);
  const structural = node && ['wall', 'column', 'block'].includes(node.type);
  const update = (patch: any) => {
    if (!readOnly && node) useScene.getState().updateNode(node.id, patch);
  };
  const beam = node?.type === 'block' && node.metadata?.insaatKind === 'beam';
  return <section className="selection-properties">
    <div ref={setActions} className="building-action-dock" />
    {structural && <div className="structural-options" key={node.id}>
      <label>Eleman adı<input disabled={readOnly} defaultValue={node.name ?? ''} onBlur={e => {
        const name = e.target.value.trim(); if (name && name !== node.name) update({ name });
      }} /></label>
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
    <div ref={setDock} className="building-inspector-dock" />
  </section>;
}
