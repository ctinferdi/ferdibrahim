import { BlockNode, StructuralGridNode, createBoxBlockTopology } from '@pascal-app/core';
import { beamPlacement, validateStructuralOptions, type PlanPoint, type StructuralOptions } from './structural-model.ts';

export function createStructuralNode(isAxis: boolean, label: string, start: PlanPoint, end: PlanPoint, options: StructuralOptions) {
  if (!validateStructuralOptions(options)) throw new Error('Geçerli ölçüler girin.');
  if (isAxis) return StructuralGridNode.parse({ name: `Aks ${label}`, label, start, end, metadata: { insaatKind: 'axis' } });
  const beam = beamPlacement(start, end, options);
  return BlockNode.parse({ name: `Kiriş ${label}`, position: beam.position, rotation: beam.rotation,
    topology: createBoxBlockTopology(beam.length, beam.height, beam.width), metadata: { insaatKind: 'beam' } });
}
