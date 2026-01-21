-- BU KODU SUPABASE SQL EDITOR'DE ÇALIŞTIRIN
-- Bu kod şunları yapar:
-- 1. Veritabanındaki tüm verileri tüm giriş yapmış kullanıcılar için görünür yapar (Böylece yeni eklediğiniz kullanıcı eski verileri görebilir)
-- 2. QR kod ile paylaşılan projelerin herkes tarafından (giriş yapmadan) görüntülenebilmesini sağlar

-- PROJELER İÇİN İZİNLER
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."projects";
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."projects";
DROP POLICY IF EXISTS "Enable update for owners" ON "public"."projects";
DROP POLICY IF EXISTS "Enable delete for owners" ON "public"."projects";

CREATE POLICY "Herkes okuyabilir" ON "public"."projects" FOR SELECT USING (true);
CREATE POLICY "Giriş yapan ekleyebilir" ON "public"."projects" FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Giriş yapan düzenleyebilir" ON "public"."projects" FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Giriş yapan silebilir" ON "public"."projects" FOR DELETE TO authenticated USING (true);

-- DAİRELER İÇİN İZİNLER (QR kodda görünmesi için)
DROP POLICY IF EXISTS "Enable read access for all users" ON "public"."apartments";
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON "public"."apartments";
DROP POLICY IF EXISTS "Enable update for owners" ON "public"."apartments";
DROP POLICY IF EXISTS "Enable delete for owners" ON "public"."apartments";

CREATE POLICY "Herkes okuyabilir" ON "public"."apartments" FOR SELECT USING (true);
CREATE POLICY "Giriş yapan ekleyebilir" ON "public"."apartments" FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Giriş yapan düzenleyebilir" ON "public"."apartments" FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Giriş yapan silebilir" ON "public"."apartments" FOR DELETE TO authenticated USING (true);

-- ÇEKLER VE GİDERLER (Sadece giriş yapanlar görsün)
DROP POLICY IF EXISTS "Checks policy" ON "public"."checks";
CREATE POLICY "Checks policy full" ON "public"."checks" FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Expenses policy" ON "public"."expenses";
CREATE POLICY "Expenses policy full" ON "public"."expenses" FOR ALL TO authenticated USING (true);
