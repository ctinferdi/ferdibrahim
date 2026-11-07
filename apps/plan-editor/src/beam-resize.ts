// Scale existing vertices rather than rebuilding a box: retain face IDs,
// materials, openings and any hand-edited topology.
export function beamBounds(topology: any) {
  const positions = topology.vertices.map((v: any) => v.position);
  return [0, 1, 2].map(axis => {
    const values = positions.map((p: number[]) => p[axis]);
    return { min: Math.min(...values), max: Math.max(...values) };
  });
}
export function resizeBeam(topology: any, axis: number, size: number) {
  if (![0, 1, 2].includes(axis) || !Number.isFinite(size) || size < 0.05 || size > 200) return null;
  const bounds = beamBounds(topology)[axis];
  const length = bounds.max - bounds.min;
  if (!Number.isFinite(length) || length <= 0) return null;
  const anchor = axis === 1 ? bounds.min : (bounds.min + bounds.max) / 2;
  return { ...topology, vertices: topology.vertices.map((vertex: any) => {
    const position = [...vertex.position];
    position[axis] = anchor + (position[axis] - anchor) * size / length;
    return { ...vertex, position };
  }) };
}
