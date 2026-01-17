import fs from 'fs';
import path from 'path';

const distPath = 'dist/assets';
const files = fs.readdirSync(distPath);
const jsFile = files.find(f => f.startsWith('index-') && f.endsWith('.js'));

if (!jsFile) {
    console.log('❌ JS dosyası bulunamadı!');
    process.exit(1);
}

const filePath = path.join(distPath, jsFile);
let content = fs.readFileSync(filePath, 'utf-8');

// Mal sahiplerini filtreden çıkar
// Eski: .filter(a => a.status === 'sold' || a.status === 'owner')
// Yeni: .filter(a => a.status === 'sold')
const oldPattern = /\.filter\(\s*[a-z]\s*=>\s*[a-z]\.status\s*===\s*['"]sold['"]\s*\|\|\s*[a-z]\.status\s*===\s*['"]owner['"]\s*\)/g;
const newPattern = ".filter(a=>a.status==='sold')";

if (content.match(oldPattern)) {
    content = content.replace(oldPattern, newPattern);
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log('✅ Değişiklik uygulandı! Tarayıcıda Ctrl+Shift+R yap.');
} else {
    console.log('⚠️ Eski kod bulunamadı. Zaten güncel olabilir.');
}
