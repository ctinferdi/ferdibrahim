import fs from 'fs';

const filePath = 'dist/assets/index-PMmfifL9.js';
let content = fs.readFileSync(filePath, 'utf-8');

// sold ve owner birlikte olması gereken yerleri bul
// Pattern: status==="sold"||...status==="owner"
const soldIdx = content.indexOf('"sold"');
console.log('📍 "sold" index:', soldIdx);

if (soldIdx > -1) {
    // sold'dan sonraki 600 karakter context
    const context = content.substring(soldIdx, soldIdx + 600);
    console.log('\n📄 "sold" sonrası 600 karakter:');
    console.log(context);
    console.log('\n' + '='.repeat(60));

    // Eğer bu context içinde owner varsa, tam pattern'i bulup değiştirelim
    if (context.includes('"owner"')) {
        console.log('\n✅ Context içinde "owner" bulundu!');

        // Tam pattern'i bul ve değiştir
        // Örnek: .status==="sold"||e.status==="owner"
        const regex = /\.status===(["'])sold\1\|\|[a-zA-Z]\.status===(["'])owner\2/g;

        if (content.match(regex)) {
            content = content.replace(regex, '.status==="sold"');
            fs.writeFileSync(filePath, content, 'utf-8');
            console.log('\n🎉 DEĞİŞİKLİK UYGULANDI! Tarayıcıda Ctrl+Shift+R yap.\n');
        } else {
            console.log('\n⚠️ Regex eşleşmedi. Manuel değişiklik gerekebilir.');

            // Context içinde tam pattern'i manuel bulalım
            const ownerInContext = context.indexOf('"owner"');
            console.log('\nContext içinde owner konumu:', ownerInContext);
            console.log('Owner çevresi:', context.substring(Math.max(0, ownerInContext - 50), ownerInContext + 50));
        }
    } else {
        console.log('\n⚠️ sold sonrası 600 karakterde owner bulunamadı. Daha fazla aramak gerekebilir.');
    }
}
