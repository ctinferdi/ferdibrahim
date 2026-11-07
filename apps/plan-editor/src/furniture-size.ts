export function resizeFurnitureAxis(dimensions: number[], current: number[] | undefined, axis: number, cm: number) {
  if (!Number.isInteger(axis) || axis < 0 || axis > 2 || !(dimensions[axis] > 0) || !Number.isFinite(cm) || cm < 1 || cm > 2000) return null;
  const scale = [...(current ?? [1, 1, 1])];
  scale[axis] = Math.sign(scale[axis] || 1) * cm / 100 / dimensions[axis];
  return scale;
}
