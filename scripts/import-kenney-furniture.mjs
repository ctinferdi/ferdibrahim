// Offline import from a pinned CC0 distribution. Never reads application/user data.
import fs from 'node:fs';
import path from 'node:path';
import { Box3, Vector3, Matrix4, Quaternion } from 'three';
const source = process.argv[2];
if (!source) throw new Error('Usage: node scripts/import-kenney-furniture.mjs <tge-assets checkout>');
const pack = JSON.parse(fs.readFileSync(path.join(source, 'catalog.json'))).packs.find(p => p.id === 'furniture-kit');
if (pack?.license !== 'CC0-1.0' || pack.author !== 'Kenney') throw new Error('Unexpected asset license');
const labels = Object.fromEntries(`
bathroomcabinet|Banyo dolabı
bathroomcabinetdrawer|Çekmeceli banyo dolabı
bathroommirror|Banyo aynası
bathroomsink|Banyo lavabosu
bathroomsinksquare|Kare lavabo
bathtub|Küvet
bear|Oyuncak ayı
bedbunk|Ranza
beddouble|Çift kişilik yatak
bedsingle|Tek kişilik yatak
bench|Bank
benchcushion|Minderli bank
benchcushionlow|Alçak minderli bank
bookcaseclosed|Kapalı kitaplık
bookcasecloseddoors|Kapaklı kitaplık
bookcaseclosedwide|Geniş kitaplık
bookcaseopen|Açık kitaplık
bookcaseopenlow|Alçak kitaplık
books|Kitaplar
cabinetbed|Komodin
cabinetbeddrawer|Çekmeceli komodin
cabinetbeddrawertable|Raflı komodin
cabinettelevision|TV ünitesi
cabinettelevisiondoors|Kapaklı TV ünitesi
cardboardboxclosed|Kapalı karton kutu
cardboardboxopen|Açık karton kutu
ceilingfan|Tavan vantilatörü
chair|Sandalye
chaircushion|Minderli sandalye
chairdesk|Çalışma sandalyesi
chairmoderncushion|Modern minderli sandalye
chairmodernframecushion|Çerçeveli sandalye
chairrounded|Yuvarlak sırtlı sandalye
coatrack|Duvar askılığı
coatrackstanding|Ayaklı askılık
computerkeyboard|Klavye
computermouse|Fare
computerscreen|Bilgisayar ekranı
desk|Çalışma masası
deskcorner|Köşe çalışma masası
dryer|Kurutma makinesi
hoodlarge|Geniş davlumbaz
hoodmodern|Modern davlumbaz
kitchenbar|Mutfak barı
kitchenbarend|Mutfak barı uç modülü
kitchenblender|Blender
kitchencabinet|Mutfak alt dolabı
kitchencabinetcornerinner|İç köşe mutfak dolabı
kitchencabinetcornerround|Yuvarlak köşe dolabı
kitchencabinetdrawer|Çekmeceli mutfak dolabı
kitchencabinetupper|Mutfak üst dolabı
kitchencabinetuppercorner|Köşe üst dolabı
kitchencabinetupperdouble|Çift kapaklı üst dolap
kitchencabinetupperlow|Kısa üst dolap
kitchencoffeemachine|Kahve makinesi
kitchenfridge|Buzdolabı
kitchenfridgebuiltin|Ankastre buzdolabı
kitchenfridgelarge|Geniş buzdolabı
kitchenfridgesmall|Mini buzdolabı
kitchenmicrowave|Mikrodalga
kitchensink|Mutfak evyesi
kitchenstove|Fırınlı ocak
kitchenstoveelectric|Elektrikli ocak
lamproundfloor|Yuvarlak lambader
lamproundtable|Yuvarlak masa lambası
lampsquareceiling|Kare tavan lambası
lampsquarefloor|Kare lambader
lampsquaretable|Kare masa lambası
lampwall|Duvar apliği
laptop|Dizüstü bilgisayar
loungechair|Salon koltuğu
loungechairrelax|Dinlenme koltuğu
loungedesignchair|Tasarım koltuk
loungedesignsofa|Tasarım kanepe
loungedesignsofacorner|Tasarım köşe kanepe
loungesofa|Kanepe
loungesofacorner|Köşe kanepe
loungesofalong|Uzun kanepe
loungesofaottoman|Koltuk pufu
pillow|Yastık
pillowblue|Mavi yastık
pillowbluelong|Uzun mavi yastık
pillowlong|Uzun yastık
plantsmall1|Küçük bitki 1
plantsmall2|Küçük bitki 2
plantsmall3|Küçük bitki 3
pottedplant|Saksı bitkisi
radio|Radyo
rugdoormat|Kapı paspası
rugrectangle|Dikdörtgen halı
ruground|Yuvarlak halı
rugrounded|Oval halı
rugsquare|Kare halı
shower|Duş kabini
showerround|Yuvarlak duş kabini
sidetable|Yan sehpa
sidetabledrawers|Çekmeceli yan sehpa
speaker|Hoparlör
speakersmall|Küçük hoparlör
stoolbar|Bar taburesi
stoolbarsquare|Kare bar taburesi
table|Yemek masası
tablecloth|Örtülü masa
tablecoffee|Orta sehpa
tablecoffeeglass|Cam orta sehpa
tablecoffeeglasssquare|Kare cam sehpa
tablecoffeesquare|Kare orta sehpa
tablecross|Çapraz ayaklı masa
tablecrosscloth|Örtülü çapraz masa
tableglass|Cam masa
tableround|Yuvarlak masa
televisionantenna|Antenli televizyon
televisionmodern|Modern televizyon
televisionvintage|Klasik televizyon
toaster|Ekmek kızartma makinesi
toilet|Klozet
toiletsquare|Kare klozet
trashcan|Çöp kutusu
washer|Çamaşır makinesi
washerdryerstacked|Çamaşır ve kurutma kulesi
`.trim().split('\n').map(line => line.split('|')));
const out = 'apps/plan-editor/public/items/kenney';
fs.mkdirSync(out, { recursive: true });
const items = [];
for (const model of pack.models) {
  const id = path.basename(model.file, '.glb');
  if (!labels[id]) continue; // Structural walls/floors use the editor's parametric tools.
  const buffer = fs.readFileSync(path.join(source, model.file));
  if (buffer.readUInt32LE(0) !== 0x46546c67) throw new Error(`Invalid GLB: ${id}`);
  const gltf = JSON.parse(buffer.subarray(20, 20 + buffer.readUInt32LE(12)));
  if ([...(gltf.buffers ?? []), ...(gltf.images ?? [])].some(a => a.uri && !a.uri.startsWith('data:'))) throw new Error(`External resource: ${id}`);
  const bounds = new Box3();
  function visit(index, parent) {
    const node = gltf.nodes[index];
    const matrix = node.matrix ? new Matrix4().fromArray(node.matrix) : new Matrix4().compose(
      new Vector3(...(node.translation ?? [0, 0, 0])), new Quaternion(...(node.rotation ?? [0, 0, 0, 1])), new Vector3(...(node.scale ?? [1, 1, 1])));
    matrix.premultiply(parent);
    if (node.mesh !== undefined) for (const primitive of gltf.meshes[node.mesh].primitives) {
      const accessor = gltf.accessors[primitive.attributes.POSITION];
      bounds.union(new Box3(new Vector3(...accessor.min), new Vector3(...accessor.max)).applyMatrix4(matrix));
    }
    for (const child of node.children ?? []) visit(child, matrix);
  }
  for (const node of gltf.scenes[gltf.scene ?? 0].nodes) visit(node, new Matrix4());
  const dimensions = bounds.getSize(new Vector3()).multiplyScalar(2).toArray();
  if (!dimensions.every(v => Number.isFinite(v) && v > 0)) throw new Error(`Invalid bounds: ${id}`);
  const center = bounds.getCenter(new Vector3());
  const name = gltf.nodes[0].name.replace(/\(Clone\)/g, '').replace(/([a-z])([A-Z0-9])/g, '$1 $2').replace(/^./, s => s.toUpperCase()) + ' · Kenney';
  const category = /^(bathroom|bathtub|shower|toilet|washer|dryer)/.test(id) ? 'bathroom' : /^(kitchen|hood|toaster)/.test(id) ? 'kitchen' : /^(computer|television|radio|speaker|laptop|ceilingfan)/.test(id) ? 'appliance' : 'furniture';
  const dir = path.join(out, id); fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(path.join(source, model.file), path.join(dir, 'model.glb'));
  fs.copyFileSync(path.join(source, model.thumb), path.join(dir, 'thumbnail.webp'));
  items.push({ id: `kenney-${id}`, name, nameTr: `${labels[id]} · Kenney`, category, tags: ['Kenney', 'CC0', labels[id]],
    src: `/plan-editor/items/kenney/${id}/model.glb`, thumbnail: `/plan-editor/items/kenney/${id}/thumbnail.webp`,
    dimensions: dimensions.map(v => +v.toFixed(6)), offset: [-center.x * 2, -bounds.min.y * 2, -center.z * 2].map(v => +v.toFixed(6)), rotation: [0, 0, 0], scale: [2, 2, 2] });
}
fs.writeFileSync('apps/plan-editor/src/kenney-catalog.json', JSON.stringify(items, null, 2) + '\n');
fs.copyFileSync(path.join(source, 'LICENSE'), path.join(out, 'LICENSE.txt'));
console.log(`Imported ${items.length} self-contained CC0 furniture models.`);
