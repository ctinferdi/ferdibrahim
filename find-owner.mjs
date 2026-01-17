import fs from 'fs';

const filePath = 'dist/assets/index-PMmfifL9.js';
const content = fs.readFileSync(filePath, 'utf-8');

// "owner" kelimesini bul
const ownerIdx = content.indexOf('"owner"');
if (ownerIdx > -1) {
    console.log('📍 "owner" bulundu, çevre:');
    console.log(content.substring(Math.max(0, ownerIdx - 200), ownerIdx + 200));
} else {
    console.log('❌ "owner" bulunamadı');

    // Belki 'owner' olarak geçiyordur
    const ownerIdx2 = content.indexOf("'owner'");
    if (ownerIdx2 > -1) {
        console.log('📍 \'owner\' bulundu, çevre:');
        console.log(content.substring(Math.max(0, ownerIdx2 - 200), ownerIdx2 + 200));
    }
}
