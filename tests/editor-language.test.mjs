import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translateLabel } from '../apps/plan-editor/src/translations.ts';
import { matchesCatalogSearch } from '../apps/plan-editor/vendor/editor/src/lib/catalog-search.ts';
test('static editor labels switch both ways without changing values or project names',()=>{
  for(const [en,tr] of [['Furniture','Mobilya'],['Materials','Malzemeler'],['Start drawing','Çizime başla'],['Width (cm)','En (cm)'],['Shadows','Gölgeler']]) {
    assert.equal(translateLabel(en,'tr'),tr); assert.equal(translateLabel(tr,'en'),en);
  }
  for(const text of ['HÜSEYİN DİNÇ','Kiriş K1','5.25','0,30 m','block_123','user:project']) {
    assert.equal(translateLabel(text,'tr'),text); assert.equal(translateLabel(text,'en'),text);
  }
  assert.equal(translateLabel('  Paint  ','tr'),'  Kaplama uygula  ');
});
test('catalog search finds Turkish and English names without rewriting stored item names',()=>{
  const item={name:'Sofa',tags:['floor','Kanepe','koltuk']};
  for(const query of ['sofa','kanepe','KOLTUK','koltuk floor']) assert.equal(matchesCatalogSearch(item,query),true);
  assert.equal(matchesCatalogSearch({name:'Washing Machine',tags:['Çamaşır makinesi']},'camasir'),true);
  assert.equal(matchesCatalogSearch(item,'masa'),false);
  assert.equal(item.name,'Sofa');
});
