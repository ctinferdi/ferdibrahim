export function adaptBuildingPlacement(source, kind) {
  if (kind === 'terrain-dependencies') {
    const edits = [
      ['node.start,', 'node.visible, node.start,'],
      ['node.polygon,', 'node.visible, node.polygon,'],
      ['!isFloorPlate(slab) &&', "!isFloorPlate(slab) && slab.metadata?.insaatKind !== 'terrain' &&"],
      ['isFloorPlate(slab) ? partitionRevision : null', "(isFloorPlate(slab) || slab.metadata?.insaatKind === 'terrain') ? partitionRevision : null"],
    ];
    for (const [from, to] of edits) {
      if (!source.includes(from)) throw new Error('Terrain dependency adapter needs updating');
      source = source.replace(from, to);
    }
    return source;
  }
  const edits = {
    wall: ['name: `Wall ${existingWallCount + index + 1}`,', 'name: wallProperties.name ? `${wallProperties.name} ${existingWallCount + index + 1}` : `Wall ${existingWallCount + index + 1}`,'],
    slab: ['SlabNode.parse({ ...defaults, name, polygon: points })', 'SlabNode.parse({ ...defaults, name: defaults.name ? `${defaults.name} ${slabCount + 1}` : name, polygon: points })'],
    elevation: ['if (slab.recessed || baseElevation == null', "if (['terrain', 'foundation'].includes(slab.metadata?.insaatKind) || slab.recessed || baseElevation == null"],
    ground: ['(node.recessed === true || (isFloorPlate(node) && node.elevation < -1e-4))', "(node.recessed === true || (['terrain', 'foundation'].includes(node.metadata?.insaatKind) && node.elevation < 0) || (isFloorPlate(node) && node.elevation < -1e-4))"],
  };
  const [from, to] = edits[kind] ?? [];
  if (!from || !source.includes(from)) throw new Error('Building placement adapter needs updating: ' + kind);
  return source.replace(from, to);
}
