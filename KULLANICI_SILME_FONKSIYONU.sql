-- BU KODU SUPABASE SQL EDITOR'DE ÇALIŞTIRIN
-- Bu kod, kullanıcıları silmek için güvenli bir fonksiyon oluşturur.
-- Frontend'den 'deleteUser' API'si çalışmadığı için bu gereklidir.

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

  -- 1. Önce public.users'dan sil (Eğer foreign key cascade yoksa diye garanti olsun)
  delete from public.users where id = target_user_id;

  -- 2. auth.users'dan sil (Asıl kullanıcıyı sistemden siler)
  -- NOT: Bu işlem kullanıcının projelerini veya diğer verilerini silmeyebilir (cascade ayarlarına bağlı)
  -- Eğer tüm verilerin silinmesini istiyorsanız, diğer tablolarda 'ON DELETE CASCADE' olması gerekir.
  delete from auth.users where id = target_user_id;
end;
$$ language plpgsql;

-- Fonksiyonu herkesin kullanabilmesini sağla (Çünkü herkes admin)
grant execute on function public.delete_user_by_id to authenticated;

SELECT '✅ Silme fonksiyonu başarıyla oluşturuldu!' as result;
