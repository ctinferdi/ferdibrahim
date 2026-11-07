export const buildingPresets = [
  { id: 'lift-wall', kind: 'wall', label: 'Asansör perdesi' },
  { id: 'foundation', kind: 'slab', label: 'Temel' },
  { id: 'lift-door', kind: 'door', label: 'Asansör kapısı' },
  { id: 'fire-door', kind: 'door', label: 'Yangın kapısı' },
  { id: 'terrain', kind: 'slab', label: 'Arazi' },
] as const;
export type BuildingPreset = typeof buildingPresets[number]['id'];
export type BuildingMeasures = { width: number; height: number; thickness: number; elevation: number; leaves: number; surface: string };
export function initialBuildingMeasures(id: BuildingPreset): BuildingMeasures {
  return { width: id === 'lift-door' ? 100 : 90, height: id === 'lift-wall' ? 300 : 210,
    thickness: id === 'foundation' ? 50 : id === 'terrain' ? 20 : 25,
    elevation: id === 'terrain' ? -0.05 : 0, leaves: id === 'lift-door' ? 2 : 1,
    surface: id === 'terrain' ? '#71834b' : 'library:concrete-raw' };
}
export function buildingPresetDefaults(id: BuildingPreset, size: BuildingMeasures): Record<string, any> | null {
  const preset = buildingPresets.find(p => p.id === id);
  if (!preset) return null;
  const between = (v: number, min: number, max: number) => Number.isFinite(v) && v >= min && v <= max;
  if (preset.kind === 'door' && (!between(size.width, 40, 500) || !between(size.height, 100, 500) || ![1, 2].includes(size.leaves))) return null;
  if (preset.kind === 'wall' && (!between(size.thickness, 5, 100) || !between(size.height, 50, 2000))) return null;
  if (preset.kind === 'slab' && (!between(size.thickness, 2, 500) || !between(size.elevation, -100, 100))) return null;
  const common = { name: preset.label, metadata: { insaatKind: id } };
  if (preset.kind === 'wall') return { ...common, thickness: size.thickness / 100, height: size.height / 100,
    slots: { a: 'library:concrete-raw', b: 'library:concrete-raw' } };
  if (preset.kind === 'slab') return { ...common, thickness: size.thickness / 100, elevation: size.elevation,
    slots: { surface: size.surface }, autoFromWalls: false };
  const lift = id === 'lift-door';
  return { ...common, width: size.width / 100, height: size.height / 100,
    doorType: lift ? 'sliding' : size.leaves === 2 ? 'double' : 'hinged', leafCount: lift ? 2 : size.leaves,
    doorCategory: 'interior', operationState: 0, trackStyle: lift ? 'pocket' : 'none',
    handle: !lift, doorCloser: !lift, panicBar: !lift, threshold: lift, swingDirection: 'outward',
    segments: [{ type: 'panel', heightRatio: 1, columnRatios: [1], panelDepth: 0, panelInset: 0 }],
    contentPadding: [0, 0], slots: { panel: lift ? '#aeb5bd' : '#a52b2b', frame: '#626b75', hardware: '#c7cbd0' } };
}
