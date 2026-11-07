import { loadAssetUrl } from '@pascal-app/core'
import { Box3, Scene, HemisphereLight, DirectionalLight, OrthographicCamera, SRGBColorSpace, Vector3 } from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { configureKtx2Support, materialTextureLoadState, resolveMaterialRef } from '@pascal-app/viewer'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'

// Serialized only into transient SVG geometry, never into the saved project.
export const TOP_VIEW_PREFIX = 'plan-top-view:'
const cache = new Map<string, Promise<string>>()
let queue: Promise<unknown> = Promise.resolve()

export function itemTopView(url: string): Promise<string> {
  const cached = cache.get(url)
  if (cached) return cached
  const result = queue.then(async () => {
    const asset = JSON.parse(decodeURIComponent(url.slice(TOP_VIEW_PREFIX.length)))
    const src = await loadAssetUrl(asset.src)
    const renderer = new WebGPURenderer({ alpha: true, antialias: true, forceWebGL: true })
    const decoder = new DRACOLoader().setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.5/')
    const originals = new Set<any>()
    let model: any
    try {
    await renderer.init()
    const loader = new GLTFLoader().setDRACOLoader(decoder)
    configureKtx2Support(loader, renderer)
    const response = await fetch(src, { signal: AbortSignal.timeout(15000) })
    if (!response.ok) throw new Error(`Model HTTP ${response.status}`)
    const gltf = await loader.parseAsync(await response.arrayBuffer(), src.slice(0, src.lastIndexOf('/') + 1))
    model = gltf.scene
    model.traverse((object: any) => {
      if (!object.material) return
      const colored = (material: any) => {
        originals.add(material)
        return material.name.startsWith('slot_') ? resolveMaterialRef(material.userData.pascal_material, {}, 'rendered') ?? material : material
      }
      object.material = Array.isArray(object.material) ? object.material.map(colored) : colored(object.material)
    })
    model.rotation.fromArray(asset.rotation ?? [0, 0, 0])
    model.scale.fromArray(asset.scale ?? [1, 1, 1])
    model.updateMatrixWorld(true)
    const bounds = new Box3().setFromObject(model)
    const size = bounds.getSize(new Vector3())
    const center = bounds.getCenter(new Vector3())
      if (![size.x, size.y, size.z].every(Number.isFinite) || size.x <= 0 || size.z <= 0) throw new Error('Empty model')
      const scene = new Scene()
      scene.add(model, new HemisphereLight(0xffffff, 0x9aa4b1, 2.5))
      const light = new DirectionalLight(0xffffff, 3)
      light.position.set(center.x - 3, bounds.max.y + 6, center.z - 4)
      light.target.position.copy(center)
      scene.add(light, light.target)
      const height = Math.max(size.x, size.y, size.z, 1) * 3
      const camera = new OrthographicCamera(-size.x / 2, size.x / 2, size.z / 2, -size.z / 2, 0.01, height * 3)
      camera.position.set(center.x, bounds.max.y + height, center.z)
      camera.up.set(0, 0, -1)
      camera.lookAt(center)
      const ratio = size.x / size.z
      renderer.setSize(ratio >= 1 ? 512 : Math.max(1, Math.round(512 * ratio)), ratio >= 1 ? Math.max(1, Math.round(512 / ratio)) : 512)
      renderer.outputColorSpace = SRGBColorSpace
      renderer.setClearColor(0x000000, 0)
      const deadline = Date.now() + 4000
      while (materialTextureLoadState().pending && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 50))
      renderer.render(scene, camera)
      return renderer.domElement.toDataURL('image/png')
    } finally {
      renderer?.dispose()
      decoder.dispose()
      model?.traverse((object: any) => {
        object.geometry?.dispose()
      })
        for (const material of originals) {
          for (const value of Object.values(material) as any[]) if (value?.isTexture) value.dispose()
          material.dispose()
        }
    }
  })
  queue = result.catch(() => {})
  cache.set(url, result)
  if (cache.size > 120) cache.delete(cache.keys().next().value!)
  return result
}
