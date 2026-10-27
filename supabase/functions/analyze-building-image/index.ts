import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_REQUEST_BYTES = 12 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const isBase64 = (value: unknown): value is string => typeof value === 'string'
    && value.length > 0
    && value.length <= MAX_FILE_BYTES * 4 / 3 + 8
    && /^[A-Za-z0-9+/]*={0,2}$/.test(value);
const jsonResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
});
const bytesToBase64 = (bytes: Uint8Array): string => {
    let binary = '';
    const chunkSize = 0x8000;
    for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
    }
    return btoa(binary);
};

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    if (req.method !== 'POST') return jsonResponse({ error: 'POST is required.' }, 405);

    try {
        const contentLength = Number(req.headers.get('content-length') || 0);
        if (contentLength > MAX_REQUEST_BYTES) return jsonResponse({ error: 'Dosya boyutu çok büyük. En fazla 8 MB yükleyin.' }, 413);

        const accessToken = req.headers.get('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
        const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
        const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
        if (!accessToken || !supabaseUrl || !serviceRoleKey) return jsonResponse({ error: 'Oturum doğrulanamadı.' }, 401);
        const serviceClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
        const { data: { user }, error: authError } = await serviceClient.auth.getUser(accessToken);
        if (authError || !user) return jsonResponse({ error: 'Oturum doğrulanamadı.' }, 401);

        const { data: mayAnalyze, error: rateError } = await serviceClient.rpc('claim_ai_analysis_slot', {
            p_user_id: user.id,
            p_cooldown_seconds: 60,
        });
        if (rateError) {
            console.error('AI analysis rate-limit check failed:', rateError.message);
            return jsonResponse({ error: 'Analiz şu anda başlatılamıyor.' }, 503);
        }
        if (mayAnalyze !== true) return jsonResponse({ error: 'Yeni analiz için lütfen bir dakika bekleyin.' }, 429);

        const bodyText = await req.text();
        if (new TextEncoder().encode(bodyText).length > MAX_REQUEST_BYTES) return jsonResponse({ error: 'Dosya boyutu çok büyük. En fazla 8 MB yükleyin.' }, 413);
        const body = JSON.parse(bodyText);
        // filesArray: [{data: base64string, mimeType: string}, ...]  (yeni format)
        // pdfBase64Array / pdfBase64 / imageUrl: geriye dönük uyumluluk
        const { imageUrl, pdfBase64, pdfBase64Array, filesArray } = body;

        const hasFiles = (Array.isArray(filesArray) && filesArray.length > 0) ||
                         (Array.isArray(pdfBase64Array) && pdfBase64Array.length > 0) ||
                         pdfBase64 || imageUrl;

        if (!hasFiles) {
            return jsonResponse({ error: 'En az bir dosya (PDF veya resim) gerekli.' }, 400);
        }

        if (Array.isArray(filesArray) && filesArray.length > 5) return jsonResponse({ error: 'Tek seferde en fazla 5 dosya yükleyin.' }, 400);
        if (Array.isArray(pdfBase64Array) && pdfBase64Array.length > 5) return jsonResponse({ error: 'Tek seferde en fazla 5 dosya yükleyin.' }, 400);

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) {
            return jsonResponse({ error: 'Analiz şu anda kullanılamıyor.' }, 503);
        }

        const mediaParts: Record<string, unknown>[] = [];

        let totalBase64Chars = 0;
        if (Array.isArray(filesArray) && filesArray.length > 0) {
            for (const f of filesArray) {
                if (!f || !ALLOWED_MIME_TYPES.has(f.mimeType) || !isBase64(f.data)) {
                    return jsonResponse({ error: 'Desteklenmeyen veya hatalı dosya biçimi.' }, 400);
                }
                totalBase64Chars += f.data.length;
                mediaParts.push({ inline_data: { mime_type: f.mimeType, data: f.data } });
            }
        } else if (Array.isArray(pdfBase64Array) && pdfBase64Array.length > 0) {
            for (const b64 of pdfBase64Array) {
                if (!isBase64(b64)) return jsonResponse({ error: 'PDF verisi geçersiz.' }, 400);
                totalBase64Chars += b64.length;
                mediaParts.push({ inline_data: { mime_type: 'application/pdf', data: b64 } });
            }
        } else if (pdfBase64) {
            if (!isBase64(pdfBase64)) return jsonResponse({ error: 'PDF verisi geçersiz.' }, 400);
            totalBase64Chars += pdfBase64.length;
            mediaParts.push({ inline_data: { mime_type: 'application/pdf', data: pdfBase64 } });
        } else {
            let url: URL;
            try {
                url = new URL(imageUrl);
            } catch {
                return jsonResponse({ error: 'Resim bağlantısı geçersiz.' }, 400);
            }
            const storageUrl = new URL(supabaseUrl);
            if (url.origin !== storageUrl.origin || !url.pathname.startsWith('/storage/v1/object/public/')) {
                return jsonResponse({ error: 'Yalnızca bu projedeki herkese açık dosyalar kullanılabilir.' }, 400);
            }
            const imgRes = await fetch(url, { redirect: 'error' });
            if (!imgRes.ok) {
                return jsonResponse({ error: 'Dosya indirilemedi.' }, 502);
            }
            const imageMime = imgRes.headers.get('content-type')?.split(';')[0].trim() || '';
            if (!ALLOWED_MIME_TYPES.has(imageMime) || Number(imgRes.headers.get('content-length') || 0) > MAX_FILE_BYTES) {
                return jsonResponse({ error: 'Görsel biçimi desteklenmiyor veya dosya çok büyük.' }, 400);
            }
            const imgBytes = new Uint8Array(await imgRes.arrayBuffer());
            if (imgBytes.length === 0 || imgBytes.length > MAX_FILE_BYTES) return jsonResponse({ error: 'Görsel dosyası boş veya çok büyük.' }, 400);
            const imgBase64 = bytesToBase64(imgBytes);
            const mimeType  = imgRes.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
            totalBase64Chars += imgBase64.length;
            mediaParts.push({ inline_data: { mime_type: mimeType, data: imgBase64 } });
        }

        if (totalBase64Chars > MAX_REQUEST_BYTES) return jsonResponse({ error: 'Toplam dosya boyutu çok büyük.' }, 413);

        const pdfCount = mediaParts.length;
        const prompt = `Bu ${pdfCount > 1 ? `${pdfCount} adet bina kat planı / cephe görseli` : 'bir bina kat planı veya cephe görseli'}. Tüm belgeleri birlikte dikkatlice analiz et.

Çıkarılacak bilgiler:
1. Binanın toplam genişliği (metre, X ekseni) — ölçü yazıyorsa kullan
2. Binanın toplam derinliği (metre, Z ekseni) — ölçü yazıyorsa kullan
3. Kat aralığı: en alt kat numarası (bodrum = negatif, zemin = 0)
4. En üst kat numarası
5. Bodrum katlarda daire sayısı
6. Zemin katta birim sayısı (dükkan veya daire)
7. Normal katlarda daire sayısı
8. En üst katta dubleks var mı?
9. Dubleks daire sayısı
10. Her dairenin yaklaşık genişliği (metre)

SADECE şu JSON formatında yanıt ver, başka hiçbir şey yazma:
{
  "buildingWidth": 14.0,
  "buildingDepth": 8.5,
  "startFloor": -1,
  "endFloor": 6,
  "basementApts": 1,
  "groundApts": 1,
  "normalApts": 4,
  "hasDuplex": true,
  "duplexCount": 4,
  "confidence": 0.90,
  "notes": "kısa açıklama"
}

Ölçü bulamazsan makul tahmin yap (standart Türk apartmanı: genişlik 12-16m, derinlik 7-10m). Confidence 0.0-1.0 arasında.`;

        const geminiRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }, ...mediaParts] }],
                    generationConfig: { maxOutputTokens: 600, temperature: 0.1 },
                }),
            }
        );

        if (!geminiRes.ok) {
            const status = geminiRes.status;
            console.error('Gemini request failed with status:', status);
            if (status === 429) return jsonResponse({ error: 'AI_RATE_LIMIT: Lütfen daha sonra tekrar deneyin.' }, 429);
            return jsonResponse({ error: 'Plan analizi tamamlanamadı. Dosya biçimini kontrol edip tekrar deneyin.' }, 502);
        }

        const geminiData = await geminiRes.json();
        const rawText    = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        const jsonMatch  = rawText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) return jsonResponse({ error: 'Plan analizi geçerli veri üretmedi.' }, 502);

        let result: Record<string, unknown>;
        try {
            result = JSON.parse(jsonMatch[0]);
        } catch {
            return jsonResponse({ error: 'Plan analizi geçerli veri üretmedi.' }, 502);
        }
        const numberInRange = (key: string, minimum: number, maximum: number): number | null => {
            const value = result[key];
            return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum ? value : null;
        };
        const integerInRange = (key: string, minimum: number, maximum: number): number | null => {
            const value = numberInRange(key, minimum, maximum);
            return value !== null && Number.isInteger(value) ? value : null;
        };
        const buildingWidth = numberInRange('buildingWidth', 1, 100);
        const buildingDepth = numberInRange('buildingDepth', 1, 100);
        const startFloor = integerInRange('startFloor', -10, 50);
        const endFloor = integerInRange('endFloor', -10, 50);
        const basementApts = integerInRange('basementApts', 0, 100);
        const groundApts = integerInRange('groundApts', 0, 100);
        const normalApts = integerInRange('normalApts', 0, 100);
        const duplexCount = integerInRange('duplexCount', 0, 100);
        const confidence = numberInRange('confidence', 0, 1);
        if ([buildingWidth, buildingDepth, startFloor, endFloor, basementApts, groundApts, normalApts, duplexCount, confidence].some(value => value === null)
            || startFloor! > endFloor! || typeof result.hasDuplex !== 'boolean') {
            return jsonResponse({ error: 'Plan analizi güvenli ve geçerli ölçüler üretmedi.' }, 502);
        }

        return jsonResponse({
            buildingWidth,
            buildingDepth,
            startFloor,
            endFloor,
            basementApts,
            groundApts,
            normalApts,
            hasDuplex: result.hasDuplex,
            duplexCount,
            confidence,
            notes: typeof result.notes === 'string' ? result.notes.slice(0, 500) : '',
        });

    } catch (e) {
        console.error('Plan analysis failed:', e instanceof Error ? e.message : 'Unknown error');
        return jsonResponse({ error: 'Plan analizi sırasında beklenmeyen bir hata oluştu.' }, 500);
    }
});
