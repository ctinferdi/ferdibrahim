import React, { useMemo } from 'react';
import { useScene } from '@pascal-app/core';
import { useViewer } from '@pascal-app/viewer';
import { useEditor } from '@pascal-app/editor';
import { RoomSelectionIndex } from '../vendor/editor/src/lib/room-selection';
import { roomFloorOwner } from '../vendor/editor/src/lib/floor-footprints';

const finishes = [
  ['wood-woodplank48', 'Düz parke', 'wood/woodplank_48/woodplank_48_BaseColor.webp'],
  ['wood-woodparquet14', 'Desenli parke', 'wood/wood_parquet_14/woodparquet_14_basecolor.webp'],
  ['flooring-tile85a', 'Fayans', 'flooring/tile_quarry/tile_quarry_basecolor.webp'],
  ['flooring-tiles4', 'Kare fayans', 'flooring/tiles_grid/tiles_grid_diffuse.jpg'],
  ['flooring-statuarettowhite', 'Beyaz mermer', 'flooring/statuaretto/statuaretto_diffuse.jpg'],
] as const;

export function useFloorFinishTarget() {
  const room = useEditor(s => s.room);
  const selected = useViewer(s => s.selection.selectedIds);
  const nodes = useScene(s => s.nodes);
  const index = useMemo(() => room ? new RoomSelectionIndex(room.levelId) : null, [room?.levelId]);
  const slabId = useMemo(() => {
    if (selected.length === 1 && nodes[selected[0]]?.type === 'slab') return selected[0];
    if (!room || !index) return null;
    // Resolve this room's floor, never a shared building base plate.
    return index.update(nodes).find(record => record.zoneId === room.zoneId)?.slabId ?? roomFloorOwner(nodes, room.zoneId)?.id ?? null;
  }, [nodes, selected, room, index]);
  const slab = slabId ? nodes[slabId] : null;
  if (!slab || slab.type !== 'slab') return null;
  const zoneId = room?.zoneId ?? (slab.zoneIds?.length === 1 ? slab.zoneIds[0] : null);
  const zone = zoneId ? nodes[zoneId] : null;
  return { slab, zone };
}

export function FloorFinishPicker() {
  const target = useFloorFinishTarget();
  const tool = useEditor(s => s.tool);
  const readOnly = useScene(s => s.readOnly);
  if (tool || !target) return null;
  const { slab, zone } = target;
  const current = (zone?.type === 'zone' ? zone.floor?.finish : null) ?? slab.slots?.surface ?? 'library:wood-woodplank48';
  return <div className="structural-options floor-finish-picker">
    <h3>Zemin kaplaması</h3>
    <div className="floor-finish-grid">{finishes.map(([id, label, texture]) => <button key={id} type="button"
      disabled={readOnly} aria-pressed={current === `library:${id}`} onClick={() => {
        if (readOnly) return;
        if (zone?.type === 'zone') {
          useScene.getState().updateNode(zone.id, { floor: { ...zone.floor, finish: `library:${id}` } });
        } else useScene.getState().updateNode(slab.id, { slots: { ...slab.slots, surface: `library:${id}` } });
      }}>
      <img src={`/plan-editor/material/${texture}`} alt="" /><span>{label}</span>
    </button>)}</div>
  </div>;
}
