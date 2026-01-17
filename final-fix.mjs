import fs from 'fs';

const filePath = 'dist/assets/index-PMmfifL9.js';
let content = fs.readFileSync(filePath, 'utf-8');

// 2. sold'u bul
let idx = content.indexOf('"sold"');
idx = content.indexOf('"sold"', idx + 1); // 2. sold

console.log(`📍 2. sold index: ${idx}\n`);

const before = content.substring(Math.max(0, idx - 200), idx);
const after = content.substring(idx, Math.min(content.length, idx + 500));

console.log('ÖNCE (200 kar):');
console.log(before);
console.log('\n--- SOLD BURASI ---\n');
console.log('SONRA (500 kar):');
console.log(after);

// owner'ı içeren tam parçayı bulalım
const ownerIdx = after.indexOf('"owner"');
console.log(`\n\nowner index (after içinde): ${ownerIdx}`);

if (ownerIdx > -1) {
    const fullPattern = after.substring(0, ownerIdx + 10);
    console.log('\n\nTam pattern:');
    console.log(fullPattern);

    // Şimdi ||X.status==="owner" kısmını bulup silelim
    // Pattern: sold")||X.status==="owner" şeklinde
    const match = after.match(/^"sold"\)\|\|[a-zA-Z]\.status===(["'])owner\1/);

    if (match) {
        console.log('\n\n✅ Pattern eşleşti:', match[0]);
        console.log('Değiştirilecek: ', match[0]);
        console.log('Yeni hali: "sold")');

        // Değişikliği uygula
        const oldStr = match[0];
        const newStr = '"sold")';

        content = content.substring(0, idx) + content.substring(idx).replace(oldStr, newStr);
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('\n🎉 BAŞARILI! Dosya güncellendi. Tarayıcıda Ctrl+Shift+R yap.\n');
    } else {
        console.log('\n⚠️ Pattern eşleşmedi, manual düzenleme lazım.');
    }
}
