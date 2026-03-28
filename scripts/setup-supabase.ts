// Supabase Setup Script
// Bu scripti bir kere çalıştır, her şeyi otomatik halleder

import { supabase } from './src/config/supabase';

async function setupSupabase() {
    console.log('🚀 Supabase kurulumu başlıyor...\n');

    try {
        // 1. Migration'ı çalıştır
        console.log('1️⃣ Database migration çalıştırılıyor...');

        const { error: migrationError } = await supabase.rpc('exec_sql', {
            sql: `
                ALTER TABLE projects ADD COLUMN IF NOT EXISTS public_code TEXT UNIQUE;
                ALTER TABLE apartments ADD COLUMN IF NOT EXISTS plan_files JSONB DEFAULT '[]';
                
                UPDATE projects 
                SET public_code = gen_random_uuid()::text 
                WHERE public_code IS NULL;
                
                CREATE INDEX IF NOT EXISTS idx_projects_public_code ON projects(public_code);
            `
        });

        if (migrationError) {
            console.error('❌ Migration hatası:', migrationError);
            console.log('\n⚠️  Manuel olarak Supabase SQL Editor\'dan çalıştırman gerekiyor.');
        } else {
            console.log('✅ Migration tamamlandı!\n');
        }

        // 2. Storage bucket kontrolü
        console.log('2️⃣ Storage bucket kontrol ediliyor...');

        const { data: buckets } = await supabase.storage.listBuckets();
        const bucketExists = buckets?.some(b => b.name === 'apartment-plans');

        if (!bucketExists) {
            console.log('📦 apartment-plans bucket oluşturuluyor...');
            const { error: bucketError } = await supabase.storage.createBucket('apartment-plans', {
                public: true,
                fileSizeLimit: 10485760 // 10MB
            });

            if (bucketError) {
                console.error('❌ Bucket oluşturulamadı:', bucketError);
                console.log('\n⚠️  Manuel olarak Supabase Storage\'dan oluşturman gerekiyor.');
            } else {
                console.log('✅ Bucket oluşturuldu!\n');
            }
        } else {
            console.log('✅ Bucket zaten mevcut!\n');
        }

        console.log('🎉 Kurulum tamamlandı!\n');
        console.log('Şimdi yapman gerekenler:');
        console.log('1. npm install qrcode.react');
        console.log('2. INSTRUCTIONS dosyalarındaki kodları ekle');
        console.log('3. Test et!\n');

    } catch (error) {
        console.error('❌ Beklenmeyen hata:', error);
    }
}

setupSupabase();
