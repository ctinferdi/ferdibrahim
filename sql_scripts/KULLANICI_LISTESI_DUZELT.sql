-- BU KODU SUPABASE SQL EDITOR'DE ÇALIŞTIRIN
-- Bu kod şunları yapar:
-- 1. 'users' adında görünür bir tablo oluşturur (çünkü auth.users tablosuna doğrudan erişilemez)
-- 2. Mevcut kayıtlı kullanıcıları bu tabloya kopyalar
-- 3. Yeni kullanıcı eklendiğinde otomatik olarak bu tabloya eklenmesini sağlar

-- 1. Tabloyu oluştur
create table if not exists public.users (
  id uuid references auth.users not null primary key,
  email text,
  created_at timestamptz default now()
);

-- 2. İzinleri ayarla (Herkes görebilsin)
alter table public.users enable row level security;

DROP POLICY IF EXISTS "Allow read access for all authenticated users" ON public.users;
create policy "Allow read access for all authenticated users" on public.users
  for select using (auth.role() = 'authenticated');

-- 3. Otomatik senkronizasyon fonksiyonu
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email, created_at)
  values (new.id, new.email, new.created_at);
  return new;
end;
$$ language plpgsql security definer;

-- 4. Tetikleyiciyi (Trigger) oluştur
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. MEVCUT KULLANICILARI SENKRONİZE ET (Çok Önemli!)
insert into public.users (id, email, created_at)
select id, email, created_at from auth.users
on conflict (id) do update set email = excluded.email;

-- Başarılı mesajı
SELECT '✅ Kullanıcı listesi senkronizasyonu tamamlandı!' as result;
