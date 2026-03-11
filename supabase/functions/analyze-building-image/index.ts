import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { status: 200, headers: CORS });
    }

    try {
        const body = await req.json();
        // filesArray: [{data: base64string, mimeType: string}, ...]  (yeni format)
        // pdfBase64Array / pdfBase64 / imageUrl: geriye dönük uyumluluk
        const { imageUrl, pdfBase64, pdfBase64Array, filesArray } = body;

        const hasFiles = (filesArray && filesArray.length > 0) ||
                         (pdfBase64Array && pdfBase64Array.length > 0) ||
                         pdfBase64 || imageUrl;

        if (!hasFiles) {
            return new Response(JSON.stringify({ error: 'En az bir dosya (PDF veya resim) gerekli' }), {
                status: 400,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        const apiKey = Deno.env.get('GEMINI_API_KEY');
        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'GEMINI_API_KEY ayarlanmamış' }), {
                status: 500,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        const mediaParts: Record<string, unknown>[] = [];

        if (filesArray && filesArray.length > 0) {
            for (const f of filesArray) {
                mediaParts.push({ inline_data: { mime_type: f.mimeType, data: f.data } });
            }
        } else if (pdfBase64Array && pdfBase64Array.length > 0) {
            for (const b64 of pdfBase64Array) {
                mediaParts.push({ inline_data: { mime_type: 'application/pdf', data: b64 } });
            }
        } else if (pdfBase64) {
            mediaParts.push({ inline_data: { mime_type: 'application/pdf', data: pdfBase64 } });
        } else {
            const imgRes = await fetch(imageUrl);
            if (!imgRes.ok) {
                return new Response(JSON.stringify({ error: 'Dosya indirilemedi' }), {
                    status: 502,
                    headers: { ...CORS, 'Content-Type': 'application/json' },
                });
            }
            const imgBytes  = new Uint8Array(await imgRes.arrayBuffer());
            const imgBase64 = btoa(String.fromCharCode(...imgBytes));
            const mimeType  = imgRes.headers.get('content-type')?.split(';')[0] || 'image/jpeg';
            mediaParts.push({ inline_data: { mime_type: mimeType, data: imgBase64 } });
        }

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
            const err = await geminiRes.text();
            const status = geminiRes.status;
            let message: string;
            if (status === 429) {
                message = `RATE_LIMIT_429: ${err}`;
            } else if (status === 400) {
                message = `BAD_REQUEST_400: ${err}`;
            } else if (status === 401 || status === 403) {
                message = `AUTH_ERROR_${status}: ${err}`;
            } else {
                message = `GEMINI_ERROR_${status}: ${err}`;
            }
            return new Response(JSON.stringify({ error: message }), {
                status: 502,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        const geminiData = await geminiRes.json();
        const rawText    = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
        const jsonMatch  = rawText.match(/\{[\s\S]*\}/);

        if (!jsonMatch) {
            return new Response(JSON.stringify({ error: 'AI yanıtı JSON içermiyor', raw: rawText }), {
                status: 502,
                headers: { ...CORS, 'Content-Type': 'application/json' },
            });
        }

        return new Response(jsonMatch[0], {
            headers: { ...CORS, 'Content-Type': 'application/json' },
        });

    } catch (e) {
        return new Response(JSON.stringify({ error: String(e) }), {
            status: 500,
            headers: { ...CORS, 'Content-Type': 'application/json' },
        });
    }
});
