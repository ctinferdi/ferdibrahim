export type PlanPoint = [number, number];
export type StructuralOptions = { label: string; length: number; fixedLength: boolean; width: number; height: number; elevation: number };

export function validateStructuralOptions(o: StructuralOptions) {
  return o.label.trim().length > 0 && o.label.trim().length <= 12 &&
    (!o.fixedLength || (Number.isFinite(o.length) && o.length >= 0.1 && o.length <= 200)) &&
    Number.isFinite(o.width) && o.width >= 5 && o.width <= 300 &&
    Number.isFinite(o.height) && o.height >= 5 && o.height <= 300 &&
    Number.isFinite(o.elevation) && Math.abs(o.elevation) <= 100;
}

export function resolveStructuralEnd(start: PlanPoint, pointer: PlanPoint, options: StructuralOptions): PlanPoint | null {
  if (!validateStructuralOptions(options)) return null;
  const dx = pointer[0] - start[0], dz = pointer[1] - start[1];
  const distance = Math.hypot(dx, dz);
  if (!Number.isFinite(distance) || distance < 0.01) return null;
  const length = options.fixedLength ? options.length : distance;
  if (length < 0.1 || length > 200) return null;
  return [start[0] + dx / distance * length, start[1] + dz / distance * length];
}

export function beamPlacement(start: PlanPoint, end: PlanPoint, options: StructuralOptions) {
  if (!validateStructuralOptions(options)) throw new Error('Geçerli kiriş ölçüleri girin.');
  const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
  if (!Number.isFinite(length) || length < 0.1 || length > 200) throw new Error('Kiriş uzunluğu 0,1–200 m olmalı.');
  return {
    length, width: options.width / 100, height: options.height / 100,
    position: [(start[0] + end[0]) / 2, options.elevation, (start[1] + end[1]) / 2] as [number, number, number],
    rotation: -Math.atan2(end[1] - start[1], end[0] - start[0]) || 0,
  };
}
