import fs from 'fs';

const filePath = 'dist/assets/index-PMmfifL9.js';
const content = fs.readFileSync(filePath, 'utf-8');

const searchTerm = '"owner"';
const matches = [];
let idx = -1;

while ((idx = content.indexOf(searchTerm, idx + 1)) !== -1) {
    matches.push({
        idx,
        before: content.substring(Math.max(0, idx - 150), idx),
        after: content.substring(idx, Math.min(content.length, idx + 150))
    });
}

console.log(`Toplam ${matches.length} adet "${searchTerm}" bulundu\n`);

matches.forEach((m, i) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`${i + 1}. BULGU (index: ${m.idx}):`);
    console.log(`${'='.repeat(60)}`);
    console.log('...', m.before + m.after, '...');
});
