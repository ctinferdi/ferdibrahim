-- ============================================
-- SUPABASE GÜVENLİK KURALLARI (RLS Policies)
-- ============================================
-- Bu SQL kodunu Supabase SQL Editor'da çalıştırın

-- 1. RLS'i Aktif Et (Row Level Security)
ALTER TABLE apartments ENABLE ROW LEVEL SECURITY;
ALTER TABLE checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- 2. APARTMENTS Tablosu İçin Güvenlik Kuralları
CREATE POLICY "Users can view their own apartments"
  ON apartments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own apartments"
  ON apartments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own apartments"
  ON apartments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own apartments"
  ON apartments FOR DELETE
  USING (auth.uid() = user_id);

-- 3. CHECKS Tablosu İçin Güvenlik Kuralları
CREATE POLICY "Users can view their own checks"
  ON checks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own checks"
  ON checks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own checks"
  ON checks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own checks"
  ON checks FOR DELETE
  USING (auth.uid() = user_id);

-- 4. EXPENSES Tablosu İçin Güvenlik Kuralları
CREATE POLICY "Users can view their own expenses"
  ON expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expenses"
  ON expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
  ON expenses FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
  ON expenses FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- TAMAMLANDI!
-- Artık her kullanıcı sadece kendi verilerini görebilir/düzenleyebilir.
-- ============================================
