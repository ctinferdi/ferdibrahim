export interface AIEnvironment {
    geminiApiKey?: string;
    supabaseUrl?: string;
    supabaseAnonKey?: string;
}

type BuildingAnalysisRequest = {
    task: 'building-analysis';
    prompt: string;
    files?: Array<{ mimeType: string; data: string }>;
};

const MAX_REQUEST_CHARS = 4_200_000;
const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

function jsonResult(status: number, body: unknown) {
    return { status, body };
}

function extractJson(text: string): unknown {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Yapay zekâ yanıtında JSON bulunamadı.');
    return JSON.parse(match[0]);
}

function isQuotaExceeded(errorData: unknown, message: string): boolean {
    if (!errorData || typeof errorData !== 'object') return false;
    const details = (errorData as { error?: { code?: unknown; status?: unknown } }).error;
    const code = typeof details?.code === 'string' ? details.code.toLowerCase() : '';
    const status = typeof details?.status === 'string' ? details.status.toLowerCase() : '';
    const quotaMessage = /your project has exceeded a quota|quota_exceeded|daily quota|(?:project|monthly) quota.{0,40}(?:exceeded|exhausted)|(?:exceeded|exhausted).{0,40}(?:project|monthly) quota/i.test(message);

    return code === 'quota_exceeded' || status === 'quota_exceeded' || quotaMessage;
}

export async function handleAIRequest(
    payload: BuildingAnalysisRequest,
    authorization: string | undefined,
    env: AIEnvironment,
) {
    if (!payload || payload.task !== 'building-analysis') {
        return jsonResult(400, { error: 'Geçersiz AI isteği.' });
    }

    if (JSON.stringify(payload).length > MAX_REQUEST_CHARS) {
        return jsonResult(413, { error: 'Dosya çok büyük. En fazla 3 MB boyutunda PDF, DXF veya görsel yükleyin.' });
    }

    if (!env.geminiApiKey) {
        return jsonResult(500, { error: 'Sunucu tarafında GEMINI_API_KEY tanımlı değil.' });
    }

    if (!authorization?.startsWith('Bearer ') || !env.supabaseUrl || !env.supabaseAnonKey) {
        return jsonResult(401, { error: 'Bu işlem için oturum açmanız gerekiyor.' });
    }

    let authResponse: Response;
    try {
        authResponse = await fetch(`${env.supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
            headers: {
                apikey: env.supabaseAnonKey,
                Authorization: authorization,
            },
        });
    } catch {
        return jsonResult(503, { error: 'Oturum doğrulanamadı. İnternet bağlantınızı kontrol edin.' });
    }
    if (!authResponse.ok) return jsonResult(401, { error: 'Oturumunuz geçersiz veya süresi dolmuş.' });

    const input: Array<Record<string, unknown>> = [];
        if (!payload.prompt || !Array.isArray(payload.files)) {
            return jsonResult(400, { error: 'Bina analizi isteği eksik.' });
        }
        input.push({ type: 'text', text: payload.prompt });
        for (const file of payload.files) {
            if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimeType)) {
                return jsonResult(400, { error: 'Bina analizi için desteklenmeyen dosya türü.' });
            }
            if (!file.data || !/^[A-Za-z0-9+/]*={0,2}$/.test(file.data)) {
                return jsonResult(400, { error: 'Dosya verisi okunamadı.' });
            }
            input.push(file.mimeType === 'application/pdf'
                ? { type: 'document', mime_type: file.mimeType, data: file.data }
                : { type: 'image', mime_type: file.mimeType, data: file.data });
        }

    const models = ['gemini-3.8-flash', 'gemini-3.6-flash'] as const;
    const requestDeadline = Date.now() + 120_000;
    const quotaGuidance = 'AI Studio’daki Rate limits sayfasından doğru projeyi ve ilgili model kotasını kontrol edin; limit doluysa sıfırlanmasını bekleyin veya kota/faturalandırma ayarını güncelleyin: https://ai.dev/rate-limit';
    let primaryQuotaExceeded = false;
    let lastError = 'Gemini analizi tamamlanamadı.';

    for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
        const model = models[modelIndex];
        const attempts = modelIndex === 0 ? 2 : 1;

        for (let attempt = 0; attempt < attempts; attempt += 1) {
            if (attempt > 0) {
                const backoffMs = 1_000 * (2 ** (attempt - 1));
                if (Date.now() + backoffMs >= requestDeadline) break;
                await new Promise(resolve => setTimeout(resolve, backoffMs));
            }

            const remainingMs = requestDeadline - Date.now();
            if (remainingMs <= 0) {
                return jsonResult(504, { error: 'Gemini analizi 120 saniyede tamamlanamadı. Daha net veya daha küçük bir plan deneyin.' });
            }

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), Math.min(60_000, remainingMs));
            let geminiResponse: Response;

            try {
                geminiResponse = await fetch(
                    'https://generativelanguage.googleapis.com/v1beta/interactions',
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-goog-api-key': env.geminiApiKey,
                        },
                        signal: controller.signal,
                        body: JSON.stringify({
                            model,
                            input,
                            store: false,
                            generation_config: {
                                thinking_level: 'low',
                                max_output_tokens: 1200,
                            },
                            response_format: { type: 'text', mime_type: 'application/json' },
                        }),
                    },
                );
            } catch (error) {
                clearTimeout(timeout);
                if (controller.signal.aborted) {
                    lastError = 'Gemini yanıtı zaman aşımına uğradı.';
                    if (modelIndex === 0) break;
                    return jsonResult(504, {
                        error: primaryQuotaExceeded
                            ? `Gemini 3.8 kota sınırına ulaştı; Gemini 3.6 yedeği de zaman aşımına uğradı. ${quotaGuidance}`
                            : 'Gemini analizi 120 saniyede tamamlanamadı. Daha sonra tekrar deneyin.',
                    });
                }
                const networkError = error instanceof Error ? error.message : 'Gemini servisine bağlanılamadı.';
                return jsonResult(502, {
                    error: primaryQuotaExceeded
                        ? `Gemini 3.8 kotası dolu; Gemini 3.6 yedeğine de bağlanılamadı. ${quotaGuidance}`
                        : networkError,
                });
            } finally {
                clearTimeout(timeout);
            }

            if (!geminiResponse.ok) {
                const errorData = await geminiResponse.json().catch(() => ({}));
                const message = errorData?.error?.message || 'Yapay zekâ servisi isteği tamamlayamadı.';
                if (isQuotaExceeded(errorData, message)) {
                    lastError = message;
                    if (modelIndex === 0) {
                        // Model quotas can differ, so skip retrying 3.8 but give the 3.6 fallback one chance.
                        primaryQuotaExceeded = true;
                        break;
                    }
                    return jsonResult(429, { error: `Gemini modelleri için kullanılabilir kota bulunamadı. ${quotaGuidance}` });
                }
                const transientFailure = [408, 429, 500, 502, 503, 504].includes(geminiResponse.status);
                lastError = message;

                if (modelIndex === 0 && transientFailure) {
                    if (attempt < attempts - 1) continue;
                    break;
                }
                return jsonResult(transientFailure ? 503 : 502, {
                    error: primaryQuotaExceeded
                        ? `Gemini 3.8 kotası dolu; Gemini 3.6 yedeği de başarısız oldu (${message}). ${quotaGuidance}`
                        : message,
                });
            }

            try {
                const geminiData = await geminiResponse.json();
                const text = geminiData.output_text
                    || geminiData.steps
                        ?.filter((step: { type?: string }) => step.type === 'model_output')
                        .flatMap((step: { content?: Array<{ type?: string; text?: string }> }) => step.content || [])
                        .filter((content: { type?: string }) => content.type === 'text')
                        .map((content: { text?: string }) => content.text || '')
                        .join('')
                    || '';
                const result = extractJson(text);


                return jsonResult(200, result);
            } catch (error) {
                lastError = error instanceof Error ? error.message : 'Gemini yanıtı okunamadı.';
                if (modelIndex === 0) break;
                return jsonResult(502, {
                    error: primaryQuotaExceeded
                        ? `Gemini 3.8 kotası dolu; Gemini 3.6 yedeğinin yanıtı okunamadı. ${quotaGuidance}`
                        : lastError,
                });
            }
        }
    }

    return jsonResult(primaryQuotaExceeded ? 429 : 503, {
        error: primaryQuotaExceeded
            ? `Gemini 3.8 kotası dolu ve Gemini 3.6 yedeği de yanıt vermedi. ${quotaGuidance}`
            : lastError.includes('zaman aşımı')
                ? 'Gemini analizi 120 saniyede tamamlanamadı. Daha sonra tekrar deneyin.'
                : 'Gemini 3.8 şu anda yoğun. Gemini 3.6 yedeği de yanıt vermedi; lütfen birkaç dakika sonra tekrar deneyin.',
    });
}
