import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/** Anchor edits to the selected geometry. Pointer motion never changes selection. */
export function SelectionPopover({ id, enabled, children }: { id: string | null; enabled: boolean; children: React.ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const lastHit = useRef<{ x: number; y: number; view: Element } | null>(null);
  const [position, setPosition] = useState<{ left: number; top: number; width: number; maxHeight: number; hidden: boolean } | null>(null);
  useEffect(() => {
    const remember = (event: PointerEvent) => {
      if (!(event.target instanceof Element) || event.target.closest('.wall-measure-popover')) return;
      const view = event.target.closest('svg') ?? (event.target.tagName === 'CANVAS' ? event.target : null);
      if (view && (view.tagName.toLowerCase() === 'canvas' || view.querySelector('[data-node-id]'))) {
        lastHit.current = { x: event.clientX, y: event.clientY, view };
      }
    };
    document.addEventListener('pointerdown', remember, true);
    return () => document.removeEventListener('pointerdown', remember, true);
  }, []);
  useEffect(() => {
    if (!enabled || !id) { setPosition(null); return; }
    const isVisible = (element: Element) => {
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return bounds.width > 0 && bounds.height > 0 && style.visibility === 'visible' && style.display !== 'none';
    };
    let raf = 0;
    const tick = () => {
      raf = requestAnimationFrame(tick);
      const entries = document.querySelectorAll<SVGGElement>(`.floorplan-registry-entry[data-node-id="${CSS.escape(id)}"]`);
      const entry = Array.from(entries).find(el => isVisible(el) && el.ownerSVGElement && isVisible(el.ownerSVGElement));
      const hit = lastHit.current;
      const canvas = Array.from(document.querySelectorAll('canvas')).find(isVisible);
      const viewElement = entry?.ownerSVGElement ?? (hit?.view.isConnected && isVisible(hit.view) ? hit.view : canvas);
      if (!viewElement) { setPosition(old => old === null ? old : null); return; }
      const view = viewElement.getBoundingClientRect();
      if (!view.width || !view.height) { setPosition(old => old === null ? old : null); return; }
      const wall = entry?.getBoundingClientRect() ?? { left: hit?.x ?? view.left + view.width / 2, right: hit?.x ?? view.left + view.width / 2, top: hit?.y ?? view.top + view.height / 2, bottom: hit?.y ?? view.top + view.height / 2, width: 0, height: 0 };
      const width = Math.min(300, view.width - 16);
      const maxHeight = Math.max(80, view.height - 32);
      const height = Math.min(panel.current?.offsetHeight || 210, maxHeight);
      const hidden = wall.right < view.left || wall.left > view.right || wall.bottom < view.top || wall.top > view.bottom;
      const cx = (Math.max(wall.left, view.left) + Math.min(wall.right, view.right)) / 2;
      const cy = (Math.max(wall.top, view.top) + Math.min(wall.bottom, view.bottom)) / 2;
      let left = cx - width / 2, top = wall.top - height - 24;
      if (wall.height > wall.width) {
        left = wall.right + 28;
        if (left + width > view.right - 8) left = wall.left - width - 28;
        top = cy - height / 2;
      } else if (top < view.top + 8) top = wall.bottom + 28;
      left = Math.max(view.left + 8, Math.min(left, view.right - width - 8));
      top = Math.max(view.top + 8, Math.min(top, view.bottom - height - 8));
      const next = { left: Math.round(left), top: Math.round(top), width, maxHeight, hidden };
      setPosition(old => old && Object.keys(next).every(key => old[key as keyof typeof next] === next[key as keyof typeof next]) ? old : next);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [id, enabled]);
  // Sidebar fallback while the scene is loading or has no visible viewport.
  if (!position) return <>{children}</>;
  return createPortal(<div ref={panel} className="wall-measure-popover" role="region" aria-label="Seçili elemanı düzenle"
    style={{ left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight, visibility: position.hidden ? 'hidden' : 'visible' }}
    onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}
    onKeyDown={e => { if (e.key !== 'Escape') e.stopPropagation(); }}>
    {children}
  </div>, document.body);
}
