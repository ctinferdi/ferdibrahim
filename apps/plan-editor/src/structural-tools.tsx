import React, { useEffect, useRef, useState } from 'react';
import { useEditor, isGridSnapActive, resolveSurfacePlanPointSnap } from '@pascal-app/editor';
import type { FloorplanToolContext } from '../vendor/editor/src/lib/floorplan/floorplan-extension';
import { resolveStructuralEnd, validateStructuralOptions, type PlanPoint, type StructuralOptions } from './structural-model';
import { createStructuralNode } from './structural-nodes';

export const defaultStructuralOptions: StructuralOptions = { label: 'K1', length: 5, fixedLength: true, width: 30, height: 50, elevation: 2.5 };

export default function StructuralTool({ activeLevelId, sceneApi, selectNode, gridSnapStep, toolDefaults, finishTool }: FloorplanToolContext) {
  const group = useRef<SVGGElement>(null);
  const start = useRef<PlanPoint | null>(null);
  const [preview, setPreview] = useState<{ start: PlanPoint; end: PlanPoint } | null>(null);
  const tool = useEditor(s => s.tool);
  const isAxis = tool === 'structural-grid';
  const options = { ...defaultStructuralOptions, ...toolDefaults } as StructuralOptions;
  const optionsRef = useRef(options); optionsRef.current = options;
  useEffect(() => {
    start.current = null; setPreview(null);
    const element = group.current, svg = element?.ownerSVGElement;
    if (!element || !svg || !activeLevelId) return;
    const consume = (event: Event) => { event.preventDefault(); event.stopPropagation(); event.stopImmediatePropagation(); };
    const point = (event: MouseEvent): PlanPoint | null => {
      const matrix = element.getScreenCTM(); if (!matrix) return null;
      const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
      const step = !event.altKey && isGridSnapActive() ? gridSnapStep : 0;
      const fallback: PlanPoint = [step ? Math.round(local.x / step) * step : local.x, step ? Math.round(local.y / step) * step : local.y];
      return resolveSurfacePlanPointSnap({ rawPoint: [local.x, local.y], fallbackPoint: fallback, levelId: activeLevelId, magnetic: !event.altKey, align: !event.altKey }).point as PlanPoint;
    };
    const move = (event: PointerEvent) => {
      if (event.buttons & 0b110) return;
      consume(event);
      const p = point(event); if (!p || !start.current) return;
      const end = resolveStructuralEnd(start.current, p, optionsRef.current);
      setPreview(end ? { start: start.current, end } : null);
    };
    const down = (event: PointerEvent) => { if (event.button === 0) consume(event); };
    const click = (event: MouseEvent) => {
      if (event.button !== 0) return; consume(event);
      const p = point(event), o = optionsRef.current;
      if (!p || !validateStructuralOptions(o)) return;
      if (!start.current) { start.current = p; return; }
      const end = resolveStructuralEnd(start.current, p, o); if (!end) return;
      const names = new Set(Object.values(sceneApi.nodes()).filter(n => n.parentId === activeLevelId).map(n => n.name));
      let label = o.label.trim(), suffix = 2;
      while (names.has(`${isAxis ? 'Aks' : 'Kiriş'} ${label}`)) label = `${o.label.trim().slice(0, 8)}-${suffix++}`;
      const node = createStructuralNode(isAxis, label, start.current, end, o);
      sceneApi.upsert(node, activeLevelId); selectNode(node.id);
      start.current = null; setPreview(null);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return; consume(event);
      if (start.current) { start.current = null; setPreview(null); } else finishTool();
    };
    svg.addEventListener('pointerdown', down, true); svg.addEventListener('pointermove', move, true);
    svg.addEventListener('click', click, true); window.addEventListener('keydown', key, true);
    return () => {
      start.current = null;
      svg.removeEventListener('pointerdown', down, true); svg.removeEventListener('pointermove', move, true);
      svg.removeEventListener('click', click, true); window.removeEventListener('keydown', key, true);
    };
  }, [activeLevelId, sceneApi, selectNode, gridSnapStep, isAxis, finishTool, toolDefaults]);
  return <g ref={group} pointerEvents="none">
    {preview && <>
      <line x1={preview.start[0]} y1={preview.start[1]} x2={preview.end[0]} y2={preview.end[1]} stroke="#2563eb" strokeWidth={isAxis ? 0.04 : options.width / 100} strokeOpacity={0.5} strokeDasharray={isAxis ? '0.25 0.1' : undefined} />
      <text x={(preview.start[0] + preview.end[0]) / 2} y={(preview.start[1] + preview.end[1]) / 2 - 0.3} fill="#2563eb" fontSize={0.25} textAnchor="middle">{Math.hypot(preview.end[0] - preview.start[0], preview.end[1] - preview.start[1]).toFixed(2)} m</text>
    </>}
  </g>;
}

// Reuse the editor's serialized native block/grid kinds, including their
// established undo, geometry, selection, autosave and JSON backup support.
export function withStructuralTools(plugin: any) {
  return { ...plugin, nodes: plugin.nodes.map((definition: any) => {
    if (!['block', 'structural-grid'].includes(definition.kind)) return definition;
    const originalFloorplan = definition.floorplan;
    return { ...definition,
      presentation: { ...definition.presentation, label: definition.kind === 'block' ? 'Kiriş' : 'Aks' },
      toolHints: [{ key: 'Left click', label: 'Başlangıç noktasını seç' }, { key: 'Left click', label: 'Bitiş yönünü seç' }, { key: 'Esc', label: 'İptal' }],
      // Placement happens in plan; the resulting beam is rendered in 3D by
      // the native block renderer. Do not also mount its old box placer.
      ...(definition.kind === 'block' ? { tool: undefined } : {}),
      extensions: { ...definition.extensions, 'pascal:editor/floorplan': {
        ...definition.extensions?.['pascal:editor/floorplan'], availableModes: ['default', 'expert'], preferredView: '2d',
        tool: async () => ({ default: StructuralTool }),
      } },
      floorplan: (node: any, context: any) => {
        if (node.metadata?.insaatKind === 'beam') {
          const xs = node.topology.vertices.map((v: any) => v.position[0]);
          const zs = node.topology.vertices.map((v: any) => v.position[2]);
          const minX = Math.min(...xs), maxX = Math.max(...xs), minZ = Math.min(...zs), maxZ = Math.max(...zs);
          const cos = Math.cos(node.rotation), sin = Math.sin(node.rotation);
          const points = [[minX,minZ],[maxX,minZ],[maxX,maxZ],[minX,maxZ]].map(([x,z]) => [node.position[0] + x*cos + z*sin, node.position[2] - x*sin + z*cos]);
          return { kind: 'group', children: [
            { kind: 'polygon', points, fill: '#94a3b8', fillOpacity: 0.25, stroke: context.viewState?.selected ? '#2563eb' : '#475569', strokeWidth: 1.5, strokeDasharray: '6 3', vectorEffect: 'non-scaling-stroke' },
            { kind: 'text', x: node.position[0], y: node.position[2], text: node.name, fontSize: 0.2, fill: '#334155', textAnchor: 'middle', upright: true },
          ] };
        }
        const geometry = originalFloorplan?.(node, context);
        // User-created axes remain visible in the normal drawing view too.
        if (node.metadata?.insaatKind === 'axis' && geometry) return { ...geometry, metadata: undefined };
        return geometry;
      },
    };
  }) };
}
