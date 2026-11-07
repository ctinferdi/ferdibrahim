import { create } from 'zustand'

// The host's building sidebar can provide a slot outside the drawing surface.
export const useInspectorDock = create<{
  element: HTMLDivElement | null
  setElement: (element: HTMLDivElement | null) => void
  actions: HTMLDivElement | null
  setActions: (actions: HTMLDivElement | null) => void
}>((set) => ({ element: null, setElement: (element) => set({ element }), actions: null, setActions: (actions) => set({ actions }) }))
