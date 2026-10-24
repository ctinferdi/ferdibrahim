import { handleAIRequest } from '../server/aiEndpoint';

declare const process: { env: Record<string, string | undefined> };

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: 'POST isteği gerekli.' });
    }

    const env = process.env;
    const result = await handleAIRequest(req.body, req.headers.authorization, {
        geminiApiKey: env.GEMINI_API_KEY,
        supabaseUrl: env.VITE_SUPABASE_URL,
        supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY,
    });

    return res.status(result.status).json(result.body);
}
