// Manuel Public Code Atama Scripti
// Bu scripti bir kere çalıştır, mevcut projelere kod atar

import { supabase } from './src/config/supabase';
import { v4 as uuidv4 } from 'uuid';

async function assignPublicCodes() {
    console.log('🔧 Mevcut projelere public_code atanıyor...\n');

    try {
        // Tüm projeleri al
        const { data: projects, error: fetchError } = await supabase
            .from('projects')
            .select('id, name, public_code');

        if (fetchError) throw fetchError;

        console.log(`📊 Toplam ${projects?.length} proje bulundu.\n`);

        // public_code olmayan projeleri bul
        const projectsWithoutCode = projects?.filter(p => !p.public_code) || [];

        console.log(`🎯 ${projectsWithoutCode.length} projeye kod atanacak.\n`);

        // Her projeye benzersiz kod ata
        for (const project of projectsWithoutCode) {
            const publicCode = crypto.randomUUID(); // Tarayıcıda çalışır

            const { error: updateError } = await supabase
                .from('projects')
                .update({ public_code: publicCode })
                .eq('id', project.id);

            if (updateError) {
                console.error(`❌ ${project.name} için hata:`, updateError);
            } else {
                console.log(`✅ ${project.name}: ${publicCode}`);
                console.log(`   Public URL: ${window.location.origin}/projeler/${publicCode}/public\n`);
            }
        }

        console.log('🎉 Tamamlandı!\n');
        console.log('Artık QR kod butonu çalışacak!');

    } catch (error) {
        console.error('❌ Hata:', error);
    }
}

// Konsola kodu kopyala-yapıştır ve çalıştır:
// assignPublicCodes();

export { assignPublicCodes };
