const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'dist', 'assets', 'index-PMmfifL9.js');

console.log('Dosya okunuyor...');
let content = fs.readFileSync(filePath, 'utf8');

console.log('Değişiklik yapılıyor...');
content = content.replace(/Kat Planı Oluştur/g, 'Kat Planını Güncelle');

console.log('Dosya yazılıyor...');
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Başarılı! Tarayıcıda Ctrl+Shift+R yapın.');
