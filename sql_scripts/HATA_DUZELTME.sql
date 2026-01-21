-- BU KODU SUPABASE SQL EDITOR'DE ÇALIŞTIRIN
-- Bu kod şunları yapar:
-- 1. Cache sorununu çözmek için API'yi yeniler
-- 2. Silme fonksiyonunu garanti olarak tekrar oluşturur

-- Önce cache'i temizle (Supabase özel komutu)
NOTIFY pgrst, 'reload config';

-- Fonksiyonu tekrar oluştur
create or replace function public.delete_user_by_id(target_user_id uuid)
returns void
security definer
set search_path = public, auth
as $$
begin
  -- Kendi kendini silmeyi engelle
  if target_user_id = auth.uid() then
    raise exception 'Kendi hesabınızı silemezsiniz!';
  end if;

  -- 1. Önce public.users'dan sil
  delete from public.users where id = target_user_id;

  -- 2. auth.users'dan sil
  delete from auth.users where id = target_user_id;
end;
$$ language plpgsql;

-- Yetki ver
grant execute on function public.delete_user_by_id to authenticated;

-- Tekrar cache yenile
NOTIFY pgrst, 'reload config';

SELECT '✅ Cache yenilendi ve fonksiyon güncellendi!' as result;
