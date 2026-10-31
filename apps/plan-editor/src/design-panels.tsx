import React from 'react';
import { ItemsPanel, MaterialPaintPanel, armMaterialPaint, useEditor, useViewer } from '@pascal-app/editor';
import { CATALOG_ITEMS } from '../vendor/editor/src/components/ui/item-catalog/catalog-items';
import { translateLabel } from './translations';
const bundledFurniture = CATALOG_ITEMS.filter(item => typeof item.src === 'string' && item.src.startsWith('/plan-editor/items/')).map(item => ({
  ...item, tags: [...(item.tags ?? []), translateLabel(item.name, 'tr'), ...(item.name === 'Sofa' ? ['koltuk'] : [])],
}));

export function FurniturePanel() {
  return <div className="design-catalog-panel">
    <header><h2>Mobilya kütüphanesi</h2><p>Kategoriden bir ürün seç, planda yerleştir. Seçtiğin ürünün konumunu ve boyutlarını özellikler panelinden düzenleyebilirsin.</p></header>
    <div className="design-catalog-body"><ItemsPanel items={bundledFurniture} showSourceFilter={false} showTagFilters={false} /></div>
  </div>;
}

export function MaterialsPanel() {
  return <div className="design-catalog-panel">
    <header><h2>Malzeme ve kaplamalar</h2><p>Kaplamayı seçip duvar, zemin veya tavan yüzeyine tıkla. Özel renk ve malzeme eklemek için alttaki + düğmesini kullan.</p>
      <button className="design-primary" onClick={() => {
        useEditor.getState().showView('3d');
        useViewer.getState().setShading('rendered'); useViewer.getState().setTextures(true);
        armMaterialPaint();
      }}>3D'de kaplama uygula</button>
    </header>
    <div className="design-catalog-body"><MaterialPaintPanel /></div>
  </div>;
}

export function AppearancePanel() {
  const shading = useViewer(s => s.shading), textures = useViewer(s => s.textures), shadows = useViewer(s => s.shadows);
  const theme = useViewer(s => s.savedSceneTheme), walls = useViewer(s => s.wallMode), edges = useViewer(s => s.edges);
  function preset(realistic: boolean) {
    const viewer = useViewer.getState();
    useEditor.getState().setTool(null); useEditor.getState().setMode('select'); useEditor.getState().showView('3d');
    viewer.setShading(realistic ? 'rendered' : 'solid'); viewer.setTextures(realistic); viewer.setShadows(realistic);
    viewer.setEdges(realistic ? 'off' : 'soft'); viewer.setSceneTheme('studio');
    if (realistic) viewer.setWallMode('cutaway');
  }
  return <div className="appearance-panel">
    <h2>3D görünüm ve ışık</h2>
    <div className="appearance-presets"><button onClick={() => preset(false)}>Hızlı çalışma</button><button className="design-primary" onClick={() => preset(true)}>Gerçekçi önizleme</button></div>
    <label>Görünüm<select value={shading} onChange={e => useViewer.getState().setShading(e.target.value as 'solid' | 'rendered')}><option value="solid">Sade model</option><option value="rendered">Malzeme ve ışık</option></select></label>
    <label>Işık ortamı<select value={theme} onChange={e => useViewer.getState().setSceneTheme(e.target.value)}>
      <option value="studio">Stüdyo</option><option value="overcast">Yumuşak gün ışığı</option><option value="sunset">Gün batımı</option><option value="mediterranean">Sıcak gün ışığı</option><option value="night">Gece</option><option value="paper">Beyaz sunum</option><option value="twilight">Alacakaranlık</option><option value="verdant">Doğa</option><option value="blueprint">Teknik çizim</option>
    </select></label>
    <label className="appearance-check"><input type="checkbox" checked={textures} onChange={e => useViewer.getState().setTextures(e.target.checked)} />Kaplama dokuları</label>
    <label className="appearance-check"><input type="checkbox" checked={shadows} onChange={e => useViewer.getState().setShadows(e.target.checked)} />Gölgeler</label>
    <label>Duvar görünümü<select value={walls} onChange={e => useViewer.getState().setWallMode(e.target.value as any)}><option value="up">Tam duvar</option><option value="cutaway">İç mekânı aç</option><option value="down">Alçak duvar</option><option value="translucent">Saydam duvar</option></select></label>
    <label>Kenar çizgileri<select value={edges} onChange={e => useViewer.getState().setEdges(e.target.value as any)}><option value="off">Kapalı</option><option value="soft">Yumuşak</option><option value="strong">Belirgin</option></select></label>
    <p>Gerçekçi önizleme malzemeleri, dokuları ve gölgeleri açar. Büyük projelerde akıcı çizim için Hızlı çalışma'yı kullan.</p>
  </div>;
}
