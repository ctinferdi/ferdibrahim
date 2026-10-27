import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { readJsonBody, requestBodyErrorResponse } from "../_shared/request-body.ts"

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? ""
const NOTIFICATION_EMAIL = "ctinferdi@gmail.com"
const ALLOWED_ACTIONS: Record<string, string> = {
    expense: "Gider Silme",
    check: "Çek Silme",
    apartment_reset: "Daire Satış İptali",
    expense_category: "Gider Kalemi Silme",
    project: "Proje Silme",
    user: "Kullanıcı Silme",
}

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
})

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;",
}[character] ?? character))

const secureCode = (): string => {
    const range = 900_000
    const ceiling = Math.floor(0x1_0000_0000 / range) * range
    const value = new Uint32Array(1)
    do crypto.getRandomValues(value)
    while (value[0] >= ceiling)
    return String(100_000 + (value[0] % range))
}

const hashCode = async (challengeId: string, code: string, secret: string): Promise<string> => {
    const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
    )
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${challengeId}:${code}`))
    return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, "0")).join("")
}

const constantTimeEqual = (left: string, right: string): boolean => {
    if (left.length !== right.length) return false
    let difference = 0
    for (let i = 0; i < left.length; i += 1) difference |= left.charCodeAt(i) ^ right.charCodeAt(i)
    return difference === 0
}

serve(async (request) => {
    if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
    if (request.method !== "POST") return json({ error: "POST is required." }, 405)

    try {
        const authorization = request.headers.get("Authorization") ?? ""
        const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1]
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
        if (!accessToken || !supabaseUrl || !serviceRoleKey || !anonKey) {
            return json({ error: "Oturum doğrulanamadı." }, 401)
        }

        const authClient = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: `Bearer ${accessToken}` } },
            auth: { persistSession: false, autoRefreshToken: false },
        })
        const { data: { user }, error: authError } = await authClient.auth.getUser()
        if (authError || !user) return json({ error: "Oturum doğrulanamadı." }, 401)

        const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        })
        const body = await readJsonBody(request)

        if (body?.phase === "request") {
            const actionType = typeof body.actionType === "string" ? body.actionType : ""
            const targetId = typeof body.targetId === "string" ? body.targetId.trim() : ""
            const targetName = typeof body.targetName === "string" ? body.targetName.trim() : ""
            const projectId = typeof body.projectId === "string" ? body.projectId : null
            const actionLabel = ALLOWED_ACTIONS[actionType]
            if (!actionLabel || !targetId || targetId.length > 180 || !targetName || targetName.length > 180) {
                return json({ error: "Silme isteği geçersiz." }, 400)
            }
            if (!RESEND_API_KEY) return json({ error: "E-posta hizmeti ayarlı değil." }, 503)

            const isSuperAdmin = user.email?.trim().toLowerCase() === "ctinferdi@gmail.com"
            let canonicalName = targetName
            let targetProjectId = projectId

            if (actionType === "project" || actionType === "user") {
                if (!isSuperAdmin) return json({ error: "Bu işlem için yönetici yetkisi gerekiyor." }, 403)
                if (actionType === "project") {
                    const { data: target, error: targetError } = await serviceClient
                        .from("projects").select("id, name").eq("id", targetId).maybeSingle()
                    if (targetError) throw targetError
                    if (!target) return json({ error: "Proje bulunamadı." }, 404)
                    targetProjectId = target.id
                    canonicalName = target.name
                } else {
                    if (targetId === user.id) return json({ error: "Kendi hesabınızı silemezsiniz." }, 400)
                    const { data: target, error: targetError } = await serviceClient.auth.admin.getUserById(targetId)
                    if (targetError) throw targetError
                    if (!target.user) return json({ error: "Kullanıcı bulunamadı." }, 404)
                    canonicalName = target.user.email || targetName
                }
            } else if (actionType === "expense") {
                const { data: target, error: targetError } = await serviceClient
                    .from("expenses").select("id, project_id, category, amount").eq("id", targetId).maybeSingle()
                if (targetError) throw targetError
                if (!target?.project_id) return json({ error: "Gider kaydı bulunamadı." }, 404)
                targetProjectId = target.project_id
                canonicalName = `${target.category || "Gider"} — ${target.amount} TL`
            } else if (actionType === "check") {
                const { data: target, error: targetError } = await serviceClient
                    .from("checks").select("id, project_id, company, check_number, amount").eq("id", targetId).maybeSingle()
                if (targetError) throw targetError
                if (!target?.project_id) return json({ error: "Çek kaydı bulunamadı." }, 404)
                targetProjectId = target.project_id
                canonicalName = `${target.company || "Çek"} No:${target.check_number || "-"} — ${target.amount} TL`
            } else if (actionType === "apartment_reset") {
                const { data: target, error: targetError } = await serviceClient
                    .from("apartments").select("id, project_id, building_name, apartment_number, status").eq("id", targetId).maybeSingle()
                if (targetError) throw targetError
                if (!target?.project_id) return json({ error: "Daire kaydı bulunamadı." }, 404)
                targetProjectId = target.project_id
                canonicalName = `${target.building_name || "Bina"} No:${target.apartment_number} (Satış İptali)`
            } else if (actionType === "expense_category") {
                if (!projectId) return json({ error: "Proje seçimi geçersiz." }, 400)
                const { data: target, error: targetError } = await serviceClient
                    .from("projects").select("id, name, expense_categories").eq("id", projectId).maybeSingle()
                if (targetError) throw targetError
                if (!target || !Array.isArray(target.expense_categories) || !target.expense_categories.includes(targetId)) {
                    return json({ error: "Gider kalemi bulunamadı." }, 404)
                }
                targetProjectId = target.id
                canonicalName = `${target.name} — ${targetId} gider kalemi`
            }

            if (!isSuperAdmin && targetProjectId) {
                const { data: profile, error: profileError } = await serviceClient
                    .from("users").select("accessible_projects").eq("id", user.id).maybeSingle()
                if (profileError) throw profileError
                const accessibleProjects = Array.isArray(profile?.accessible_projects) ? profile.accessible_projects : []
                if (!accessibleProjects.includes(targetProjectId)) {
                    return json({ error: "Bu kayıt için yetkiniz yok." }, 403)
                }
            }

            const { error: cleanupError } = await serviceClient
                .from("delete_action_challenges")
                .delete()
                .eq("user_id", user.id)
                .is("used_at", null)
                .lt("expires_at", new Date().toISOString())
            if (cleanupError) throw cleanupError

            const recentCutoff = new Date(Date.now() - 60_000).toISOString()
            const { data: recent, error: recentError } = await serviceClient
                .from("delete_action_challenges")
                .select("id")
                .eq("user_id", user.id)
                .gte("created_at", recentCutoff)
                .limit(1)
            if (recentError) throw recentError
            if (recent?.length) return json({ error: "Yeni kod istemeden önce bir dakika bekleyin." }, 429)

            const cleanupExpiredCutoff = new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString()
            const { error: cleanupExpiredError } = await serviceClient
                .from("delete_action_challenges")
                .delete()
                .eq("user_id", user.id)
                .lt("created_at", cleanupExpiredCutoff)
            if (cleanupExpiredError) throw cleanupExpiredError

            const { error: invalidatePreviousError } = await serviceClient
                .from("delete_action_challenges")
                .update({ used_at: new Date().toISOString() })
                .eq("user_id", user.id)
                .is("used_at", null)
            if (invalidatePreviousError) throw invalidatePreviousError

            const challengeId = crypto.randomUUID()
            const code = secureCode()
            const codeHash = await hashCode(challengeId, code, serviceRoleKey)
            const { error: insertError } = await serviceClient
                .from("delete_action_challenges")
                .insert({
                    id: challengeId,
                    user_id: user.id,
                    action_type: actionType,
                    target_id: targetId,
                    project_id: targetProjectId,
                    code_hash: codeHash,
                    expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
                })
            if (insertError) throw insertError

            const email = user.email?.trim().toLowerCase()
            if (!email) {
                await serviceClient.from("delete_action_challenges").delete().eq("id", challengeId)
                return json({ error: "Hesabınızda doğrulanmış bir e-posta adresi bulunamadı." }, 400)
            }

            const emailResponse = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
                body: JSON.stringify({
                    from: "InsaatHesapp <onboarding@resend.dev>",
                    to: [NOTIFICATION_EMAIL],
                    subject: `GÜVENLİK KODU: ${actionLabel}`,
                    html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #eee;border-radius:10px"><h2 style="color:#f5576c">Silme İşlemi Onayı</h2><p>Sistemde kritik bir işlem talep edildi.</p><p><strong>İşlem:</strong> ${escapeHtml(actionLabel)}</p><p><strong>Hedef:</strong> ${escapeHtml(canonicalName)}</p><p><strong>Talep eden:</strong> ${escapeHtml(email)}</p><p>İşlemi onaylamak için bu kodu girin:</p><div style="background:#667eea;color:#fff;padding:15px 30px;font-size:28px;font-weight:800;text-align:center;border-radius:8px;letter-spacing:5px">${code}</div><p style="color:#64748b;font-size:12px">Kod 10 dakika içinde geçerliliğini yitirir.</p></div>`,
                }),
            })

            if (!emailResponse.ok) {
                console.error("Delete confirmation email failed with status:", emailResponse.status)
                await serviceClient.from("delete_action_challenges").delete().eq("id", challengeId)
                return json({ error: "Güvenlik kodu e-postayla gönderilemedi." }, 502)
            }

            return json({ challengeId, expiresInSeconds: 600 })
        }

        if (body?.phase === "verify") {
            const challengeId = typeof body.challengeId === "string" ? body.challengeId : ""
            const code = typeof body.code === "string" ? body.code : ""
            if (!/^[0-9a-f-]{36}$/i.test(challengeId) || !/^\d{6}$/.test(code)) {
                return json({ error: "Güvenlik kodu geçersiz veya süresi dolmuş." }, 400)
            }

            const { data: challenge, error: challengeError } = await serviceClient
                .from("delete_action_challenges")
                .select("id, code_hash, attempts, expires_at")
                .eq("id", challengeId)
                .eq("user_id", user.id)
                .is("used_at", null)
                .maybeSingle()
            if (challengeError) throw challengeError
            if (!challenge || new Date(challenge.expires_at).getTime() <= Date.now() || challenge.attempts >= 5) {
                return json({ error: "Güvenlik kodu geçersiz veya süresi dolmuş." }, 400)
            }

            const submittedHash = await hashCode(challengeId, code, serviceRoleKey)
            if (!constantTimeEqual(submittedHash, challenge.code_hash)) {
                const nextAttempts = challenge.attempts + 1
                const { data: updated, error: attemptError } = await serviceClient
                    .from("delete_action_challenges")
                    .update({ attempts: nextAttempts, ...(nextAttempts >= 5 ? { used_at: new Date().toISOString() } : {}) })
                    .eq("id", challengeId)
                    .eq("user_id", user.id)
                    .eq("attempts", challenge.attempts)
                    .is("used_at", null)
                    .select("id")
                if (attemptError) throw attemptError
                if (!updated?.length) return json({ error: "Çok fazla deneme oldu. Yeni kod isteyin." }, 429)
                return json({ error: "Güvenlik kodu hatalı." }, 400)
            }

            const { data: consumed, error: consumeError } = await serviceClient
                .from("delete_action_challenges")
                .update({ used_at: new Date().toISOString() })
                .eq("id", challengeId)
                .eq("user_id", user.id)
                .is("used_at", null)
                .select("id")
                .maybeSingle()
            if (consumeError) throw consumeError
            if (!consumed) return json({ error: "Bu güvenlik kodu daha önce kullanılmış." }, 409)
            return json({ verified: true })
        }

        return json({ error: "İstek türü geçersiz." }, 400)
    } catch (error) {
        const bodyError = requestBodyErrorResponse(error, corsHeaders)
        if (bodyError) return bodyError
        console.error("Delete confirmation failed:", error instanceof Error ? error.message : "Unknown error")
        return json({ error: "Güvenlik işlemi tamamlanamadı. Tekrar deneyin." }, 500)
    }
})
