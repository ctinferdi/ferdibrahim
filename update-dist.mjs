import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, 'dist', 'assets', 'index-PMmfifL9.js');

console.log('Dosya okunuyor...');
let content = readFileSync(filePath, 'utf8');

console.log('Değişiklik yapılıyor...');
content = content.replace(/Kat Planı Oluştur/g, 'Kat Planını Güncelle');

console.log('Dosya yazılıyor...');
writeFileSync(filePath, content, 'utf8');

console.log('✅ Başarılı! Tarayıcıda Ctrl+Shift+R yapın.');
