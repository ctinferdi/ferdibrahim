import fs from 'fs';

const filePath = 'dist/assets/index-PMmfifL9.js';
let content = fs.readFileSync(filePath, 'utf-8');

// "owner" kelimesini bul ve değiştir
const ownerIdx = content.indexOf('"owner"');
if (ownerIdx > -1) {
    const context = content.substring(Math.max(0, ownerIdx - 300), ownerIdx + 300);
    console.log('📍 Bulunan context (600 karakter):');
    console.log(context);
    console.log('\n---\n');

    // Şimdi filter içinde owner'ı bulup çıkaralım
    // Pattern: ||e.status==="owner" veya ||a.status==="owner" gibi
    const replacements = [
        { from: '||e.status==="owner"', to: '' },
        { from: '||a.status==="owner"', to: '' },
        { from: '||t.status==="owner"', to: '' },
        { from: '||r.status==="owner"', to: '' },
        { from: '||n.status==="owner"', to: '' },
        { from: '||i.status==="owner"', to: '' },
        { from: '||s.status==="owner"', to: '' },
        { from: '||o.status==="owner"', to: '' },
        { from: '||w.status==="owner"', to: '' },
        { from: '||P.status==="owner"', to: '' }
    ];

    let changed = false;
    replacements.forEach(({ from, to }) => {
        if (content.includes(from)) {
            content = content.replace(from, to);
            changed = true;
            console.log(`✅ Değiştirildi: ${from}`);
        }
    });

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log('\n🎉 Dosya güncellendi! Tarayıcıda Ctrl+Shift+R yap.');
    } else {
        console.log('\n⚠️ Değiştirilecek pattern bulunamadı.');
    }
} else {
    console.log('❌ "owner" bulunamadı');
}
