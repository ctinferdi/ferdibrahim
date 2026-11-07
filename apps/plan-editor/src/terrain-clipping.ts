import { difference, union, levelFootprintLoops, getRenderableSlabPolygon, slabPolygonContextFromGeometry, type MultiPolygon, type Ring } from '@pascal-app/core';

export const isTerrain = (node: any) => node?.type === 'slab' && node.metadata?.insaatKind === 'terrain';

// Derived presentation only: the user's terrain outline/holes stay untouched in
// the scene, undo history and backups. All inputs are in the same level frame.
export function terrainRegions(node: any, context: any): MultiPolygon {
  const subject = { outer: node.polygon as Ring, holes: (node.holes ?? []) as Ring[] };
  const level = context?.parent;
  if (level?.type !== 'level') return [subject];
  const children = (level.children ?? []).map((id: string) => context.resolve(id))
    .filter((child: any) => child && child.visible !== false);
  const nodes = Object.fromEntries(children.map((child: any) => [child.id, child]));
  const visibleLevel = { ...level, children: children.map((child: any) => child.id) };
  const wallBands = levelFootprintLoops(nodes, visibleLevel);
  // Filling the wall union's outer contours cuts to the OUTSIDE wall face,
  // including curved walls, instead of leaving grass inside enclosed rooms.
  const wallOutlines = union(wallBands).map(region => region.outer);
  const slabContext = slabPolygonContextFromGeometry(context);
  const floors = children.filter((child: any) => child.type === 'slab' && child.id !== node.id && !isTerrain(child))
    .map((child: any) => ({ outer: getRenderableSlabPolygon(child, slabContext), holes: child.holes ?? [] }));
  const building = union([...wallOutlines, ...floors]);
  return building.length ? difference(subject, building, { throwOnError: true }) : [subject];
}

export function terrainPath(regions: MultiPolygon): string {
  return regions.flatMap(region => [region.outer, ...region.holes]).map(ring =>
    ring.length ? `M ${ring.map(point => point.join(' ')).join(' L ')} Z` : '').join(' ');
}

export function clipTerrainFloorplan(geometry: any, regions: MultiPolygon) {
  if (geometry?.kind !== 'group') return geometry;
  // Keep only the original editable boundary handles. Generated building holes
  // must never become editable terrain holes or receive an opaque selection hatch.
  return { ...geometry, children: geometry.children.filter((child: any) => child.kind !== 'hatch')
    .map((child: any, index: number) => index === 0 && child.kind === 'path'
      ? { ...child, d: terrainPath(regions), fillRule: 'evenodd' } : child) };
}
