import fs from 'fs';

const filePath = 'dist/assets/index-PMmfifL9.js';
let content = fs.readFileSync(filePath, 'utf-8');

// Listelemede mal sahiplerini çıkar
// .filter(a => a.status === 'sold' || a.status === 'owner') --> .filter(a => a.status === 'sold')

// Minified kodda farklı değişken isimleri olabilir, hepsini yakalayalım
const patterns = [
    /\.filter\(\s*(\w+)\s*=>\s*\1\.status\s*===\s*["']sold["']\s*\|\|\s*\1\.status\s*===\s*["']owner["']\s*\)/g,
    /\.filter\((\w+)=>(\w+)\.status===["']sold["']\|\|(\w+)\.status===["']owner["']\)/g
];

let changed = false;
patterns.forEach(pattern => {
    if (content.match(pattern)) {
        content = content.replace(pattern, (match, varName) => {
            changed = true;
            return `.filter(${varName}=>${varName}.status==="sold")`;
        });
    }
});

if (changed) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('✅ Değişiklik uygulandı! Tarayıcıda Ctrl+Shift+R yap.');
} else {
    // Değişiklik bulunamadıysa, dosyanın bir kısmını göster
    const sample = content.substring(0, 1000);
    console.log('⚠️ Pattern bulunamadı. Dosya içeriği sample:');
    console.log(sample);

    // sold ve owner araması yapalım
    if (content.includes('sold') && content.includes('owner')) {
        const soldIndex = content.indexOf('"sold"');
        const context = content.substring(Math.max(0, soldIndex - 100), soldIndex + 200);
        console.log('\n📍 "sold" çevresi:');
        console.log(context);
    }
}
