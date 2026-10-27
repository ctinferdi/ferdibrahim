import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { readJsonBody, requestBodyErrorResponse } from "../_shared/request-body.ts"

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
})

const hashCode = async (challengeId: string, code: string, secret: string): Promise<string> => {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${challengeId}:${code}`))
    return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, "0")).join("")
}

const constantTimeEqual = (left: string, right: string): boolean => {
    if (left.length !== right.length) return false
    let difference = 0
    for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
    return difference === 0
}

serve(async (request) => {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders })
    if (request.method !== "POST") return response({ error: "POST is required." }, 405)

    try {
        const accessToken = request.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        if (!accessToken || !supabaseUrl || !serviceRoleKey) return response({ error: "Oturum doğrulanamadı." }, 401)

        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        })
        const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(accessToken)
        if (authError || !caller) return response({ error: "Oturum doğrulanamadı." }, 401)
        if (caller.email?.trim().toLowerCase() !== "ctinferdi@gmail.com") {
            return response({ error: "Bu işlem için yönetici yetkisi gerekiyor." }, 403)
        }

        const body = await readJsonBody(request)
        const targetUserId = typeof body?.targetUserId === "string" ? body.targetUserId : ""
        const challengeId = typeof body?.challengeId === "string" ? body.challengeId : ""
        const code = typeof body?.code === "string" ? body.code : ""
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(targetUserId)) {
            return response({ error: "Kullanıcı seçimi geçersiz." }, 400)
        }
        if (targetUserId === caller.id) return response({ error: "Yönetici hesabınızı buradan silemezsiniz." }, 400)
        if (!/^[0-9a-f-]{36}$/i.test(challengeId) || !/^\d{6}$/.test(code)) {
            return response({ error: "Silme onayı geçersiz veya süresi dolmuş." }, 400)
        }

        const { data: challenge, error: challengeError } = await adminClient
            .from("delete_action_challenges")
            .select("id, code_hash, attempts, expires_at")
            .eq("id", challengeId)
            .eq("user_id", caller.id)
            .eq("action_type", "user")
            .eq("target_id", targetUserId)
            .is("used_at", null)
            .maybeSingle()
        if (challengeError) throw challengeError
        if (!challenge || new Date(challenge.expires_at).getTime() <= Date.now() || challenge.attempts >= 5) {
            return response({ error: "Silme onayı geçersiz veya süresi dolmuş." }, 400)
        }

        const submittedHash = await hashCode(challengeId, code, serviceRoleKey)
        if (!constantTimeEqual(submittedHash, challenge.code_hash)) {
            const nextAttempts = challenge.attempts + 1
            const { data: updated, error: attemptError } = await adminClient
                .from("delete_action_challenges")
                .update({ attempts: nextAttempts, ...(nextAttempts >= 5 ? { used_at: new Date().toISOString() } : {}) })
                .eq("id", challengeId)
                .eq("user_id", caller.id)
                .eq("action_type", "user")
                .eq("target_id", targetUserId)
                .eq("attempts", challenge.attempts)
                .is("used_at", null)
                .select("id")
            if (attemptError) throw attemptError
            if (!updated?.length) return response({ error: "Çok fazla deneme oldu. Yeni kod isteyin." }, 429)
            return response({ error: "Güvenlik kodu hatalı." }, 400)
        }

        const { data: consumed, error: consumeError } = await adminClient
            .from("delete_action_challenges")
            .update({ used_at: new Date().toISOString() })
            .eq("id", challengeId)
            .eq("user_id", caller.id)
            .eq("action_type", "user")
            .eq("target_id", targetUserId)
            .is("used_at", null)
            .select("id")
            .maybeSingle()
        if (consumeError) throw consumeError
        if (!consumed) return response({ error: "Bu güvenlik kodu daha önce kullanılmış." }, 409)

        const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId)
        if (deleteError) {
            console.error("Admin user deletion failed:", deleteError.message)
            return response({ error: "Kullanıcı silinemedi. Daha sonra tekrar deneyin." }, 400)
        }
        return response({ success: true })
    } catch (error) {
        const bodyError = requestBodyErrorResponse(error, corsHeaders)
        if (bodyError) return bodyError
        console.error("Admin user deletion failed:", error instanceof Error ? error.message : "Unknown error")
        return response({ error: "Kullanıcı silinemedi. Daha sonra tekrar deneyin." }, 500)
    }
})
