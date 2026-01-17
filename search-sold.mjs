import fs from 'fs';

const filePath = 'dist/assets/index-PMmfifL9.js';
let content = fs.readFileSync(filePath, 'utf-8');

// Tüm "sold" geçen yerleri bul
let idx = -1;
let count = 0;

console.log('🔍 Tüm "sold" geçişlerini arıyorum...\n');

while ((idx = content.indexOf('"sold"', idx + 1)) !== -1) {
    count++;
    const context = content.substring(idx, Math.min(content.length, idx + 300));

    if (context.includes('"owner"')) {
        console.log(`\n✅ ${count}. sold bulundu ve owner ile birlikte! (index: ${idx})`);
        console.log('Context:');
        console.log(context.substring(0, 250));
        console.log('\n' + '='.repeat(70));

        // Bu bölgede owner'ı silelim
        // Pattern: ||X.status==="owner" şeklinde olabilir
        const beforeContext = content.substring(Math.max(0, idx - 100), idx);
        console.log('\nÖnceki 100 karakter:');
        console.log(beforeContext);
    }
}

console.log(`\n\n📊 Toplam ${count} adet "sold" bulundu.`);
