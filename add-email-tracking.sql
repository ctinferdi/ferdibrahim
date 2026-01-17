-- Expenses tablosuna e-posta takibi için yeni sütun ekle
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by_email TEXT;

-- Geçmiş kayıtlar için (opsiyonel) mevcut kullanıcıid'lerinden e-posta çekilemez 
-- çünkü auth.users detayları sql içinden bu şekilde çekilmez rls nedeniyle.
-- Yeni kayıtlar artık otomatik olarak e-posta ile dolacaktır.
