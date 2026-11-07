// Change presentation only; native geometry, hit targets and saved nodes stay intact.
export function decoratePlanGeometry(kind: string, node: any, geometry: any, selected: boolean) {
  if (!geometry) return geometry;
  if (kind === 'wall') {
    const visit = (part: any): any => part.kind === 'group'
      ? { ...part, children: part.children.filter((child: any) => child.affordance !== 'thickness').map(visit) }
      : part;
    return visit(geometry);
  }
  if (kind === 'slab' && geometry.kind === 'group') {
    let decorated = false;
    return { ...geometry, children: geometry.children.map((child: any) => {
      if (decorated || child.kind !== 'path' || child.fill === 'none') return child;
      decorated = true;
      return { ...child, fillRule: 'evenodd', planSlabId: node.id, planSurface: node.slots?.surface ?? 'library:wood-woodplank48', fillOpacity: selected ? 0.8 : 1 };
    }) };
  }
  if (selected || !['door', 'window'].includes(kind)) return geometry;
  const visit = (part: any): any => {
    if (part.kind === 'group') return { ...part, children: part.children.map(visit) };
    return {
      ...part,
      ...(part.fill && part.fill !== 'none' ? { fill: kind === 'window' ? '#dceef2' : '#ead6bb' } : {}),
      ...(part.stroke && part.stroke !== 'none' ? { stroke: kind === 'window' ? '#426875' : '#6b5948', strokeOpacity: 1 } : {}),
    };
  };
  return visit(geometry);
}
