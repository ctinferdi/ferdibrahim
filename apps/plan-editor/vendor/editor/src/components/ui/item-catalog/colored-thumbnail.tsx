import { useEffect, useRef, useState } from 'react'
import { Box3, Color, DirectionalLight, HemisphereLight, Mesh, PerspectiveCamera, Scene, Vector3 } from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { configureKtx2Support, materialTextureLoadState, resolveMaterialRef } from '@pascal-app/viewer'

// One renderer, serialized jobs and only visible tiles. No scene-store writes.
const cache = new Map<string, string>()
let queue = Promise.resolve()
let renderer: WebGPURenderer | undefined
let decoder: DRACOLoader | undefined
let idle: ReturnType<typeof setTimeout> | undefined

async function renderModel(src: string) {
  if (!renderer) {
    const next = new WebGPURenderer({ antialias: true, forceWebGL: true })
    try { await next.init() } catch (error) { next.dispose(); throw error }
    next.setSize(256, 256)
    renderer = next
  }
  decoder ??= new DRACOLoader().setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.5/')
  const loader = new GLTFLoader().setDRACOLoader(decoder)
  configureKtx2Support(loader, renderer)
  // A stalled download must not block every subsequent visible tile.
  const response = await fetch(src, { signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error(`Model HTTP ${response.status}`)
  const gltf = await loader.parseAsync(await response.arrayBuffer(), src.slice(0, src.lastIndexOf('/') + 1))
  const originals = new Set<any>()
  const geometries = new Set<any>()
  try {
    gltf.scene.traverse(object => {
      if (!(object instanceof Mesh)) return
      geometries.add(object.geometry)
      const colored = (material: any) => {
        originals.add(material)
        // Match the native item's curated material slots, retaining authored fallback.
        return material.name.startsWith('slot_')
          ? resolveMaterialRef(material.userData.pascal_material, {}, 'rendered') ?? material
          : material
      }
      object.material = Array.isArray(object.material) ? object.material.map(colored) : colored(object.material)
    })
    const bounds = new Box3().setFromObject(gltf.scene)
    const center = bounds.getCenter(new Vector3()), size = bounds.getSize(new Vector3())
    const radius = size.length() / 2
    if (!Number.isFinite(radius) || radius <= 0) throw new Error('Empty model')
    const scene = new Scene()
    scene.background = new Color('#e9edf1')
    scene.add(gltf.scene, new HemisphereLight(0xffffff, 0x79828c, 2.4))
    const light = new DirectionalLight(0xffffff, 3)
    light.position.copy(center).add(new Vector3(radius * 2, radius * 4, radius * 3))
    light.target.position.copy(center)
    scene.add(light, light.target)
    const camera = new PerspectiveCamera(35, 1, radius / 100, radius * 30)
    const distance = radius / Math.sin(35 * Math.PI / 360) * 1.12
    camera.position.copy(center).add(new Vector3(1, 0.65, 1).normalize().multiplyScalar(distance))
    camera.lookAt(center)
    const deadline = Date.now() + 4000
    while (materialTextureLoadState().pending && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50))
    renderer.render(scene, camera)
    return renderer.domElement.toDataURL('image/webp', 0.86)
  } finally {
    geometries.forEach(geometry => geometry.dispose())
    // Library materials belong to the viewer cache; dispose only the loaded GLB resources.
    originals.forEach(material => {
      Object.values(material).forEach((value: any) => { if (value?.isTexture) value.dispose() })
      material.dispose()
    })
  }
}

export function ColoredThumbnail({ src, fallback, name }: { src?: string; fallback: string; name: string }) {
  const ref = useRef<HTMLImageElement>(null)
  const [preview, setPreview] = useState<{ src: string; image: string }>()
  useEffect(() => {
    // The CC0 pack already ships colored renders; avoid decoding those models twice.
    if (!(src?.startsWith('/plan-editor/items/') || src?.startsWith('data:model/gltf-binary')) || src.startsWith('/plan-editor/items/kenney/') || !ref.current) return
    let active = true
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return
      observer.disconnect()
      queue = queue.then(async () => {
        if (!active) return
        clearTimeout(idle)
        try {
          const image = cache.get(src) ?? await renderModel(src)
          cache.set(src, image)
          if (cache.size > 120) cache.delete(cache.keys().next().value!)
          if (active) setPreview({ src, image })
        } catch { /* Keep the supplied archive thumbnail if WebGL/model loading fails. */ }
        finally {
          idle = setTimeout(() => { renderer?.dispose(); renderer = undefined; decoder?.dispose(); decoder = undefined }, 10000)
        }
      })
    }, { rootMargin: '80px' })
    observer.observe(ref.current)
    return () => { active = false; observer.disconnect() }
  }, [src])
  return <img ref={ref} alt={name} className="h-full w-full object-cover" loading="lazy" src={preview?.src === src ? preview.image : fallback} />
}
