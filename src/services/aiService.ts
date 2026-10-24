import { supabase } from '../config/supabase';

export interface AIUploadedFile {
    name?: string;
    mimeType: string;
    data: string;
}

export interface FloorPlanAIRequest {
    task: 'floor-plan';
    source:
        | {
            kind: 'media';
            name: string;
            mimeType: string;
            data: string;
        }
        | {
            kind: 'dxf';
            name: string;
            geometry: Record<string, unknown>;
        };
}

export async function requestAI<T>(payload: FloorPlanAIRequest | {
    task: 'building-analysis';
    prompt: string;
    files: AIUploadedFile[];
}): Promise<T> {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session?.access_token) throw new Error('AI analizi için önce giriş yapın.');

    const response = await fetch('/api/analyze-floorplan', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(result?.error || `AI isteği başarısız oldu (${response.status}).`);
    }
    return result as T;
}
