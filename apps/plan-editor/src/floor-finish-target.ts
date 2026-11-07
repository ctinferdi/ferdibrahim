type FloorNode = { id: string; type: string; zoneIds?: readonly string[]; metadata?: Record<string, unknown> };
const isFloor = (node: FloorNode | null | undefined) => node?.type === 'slab' && !['terrain', 'foundation'].includes(String(node.metadata?.insaatKind));

/** Explicit object selection takes priority over the editor's retained room context. */
export function resolveFloorFinishTarget<T extends FloorNode>(
  nodes: Record<string, T>, selected: readonly string[], roomZoneId: string | null,
  resolveRoomSlab: () => string | null,
): { slab: T; zone: T | null } | null {
  if (selected.length > 0) {
    const slab = selected.length === 1 ? nodes[selected[0]] : null;
    if (!slab || !isFloor(slab)) return null;
    const zoneId = slab.zoneIds?.length === 1 ? slab.zoneIds[0]
      : roomZoneId && slab.zoneIds?.includes(roomZoneId) ? roomZoneId : null;
    const zone = zoneId ? nodes[zoneId] : null;
    return { slab, zone: zone?.type === 'zone' ? zone : null };
  }
  const zone = roomZoneId ? nodes[roomZoneId] : null;
  if (zone?.type !== 'zone') return null;
  const slabId = resolveRoomSlab();
  const slab = slabId ? nodes[slabId] : null;
  return slab && isFloor(slab) ? { slab, zone } : null;
}
