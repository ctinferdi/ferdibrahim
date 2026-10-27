import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { readJsonBody, requestBodyErrorResponse } from "../_shared/request-body.ts"

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const genericResponse = () => new Response(
    JSON.stringify({ message: "E-posta adresi sistemde kayıtlıysa sıfırlama bağlantısı gönderilir." }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" } },
)

const hashAddress = async (email: string, secret: string): Promise<string> => {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"])
    const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(email))
    return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, "0")).join("")
}

const allowedOrigins = new Set([
    "https://insaathesapp.com",
    "https://www.insaathesapp.com",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://localhost:3000",
    "http://localhost:3001",
])

serve(async (request) => {
    if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: corsHeaders })
    }
    if (request.method !== "POST") {
        return new Response(JSON.stringify({ error: "POST is required." }), {
            status: 405,
            headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
        })
    }

    try {
        const body = await readJsonBody(request)
        const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return genericResponse()
        }

        const origin = request.headers.get("origin") ?? ""
        if (!allowedOrigins.has(origin)) return genericResponse()

        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? ""
        if (!supabaseUrl || !serviceRoleKey || !anonKey) {
            console.error("Password reset is missing required Supabase configuration.")
            return new Response(JSON.stringify({ error: "Şu anda işlem tamamlanamadı. Daha sonra tekrar deneyin." }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
            })
        }

        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        })
        const addressHash = await hashAddress(email, serviceRoleKey)
        const { data: mayRequestReset, error: rateLimitError } = await adminClient.rpc("claim_password_reset_slot", {
            p_address_hash: addressHash,
            p_cooldown_seconds: 600,
        })
        if (rateLimitError) {
            console.error("Password reset rate limit failed:", rateLimitError.message)
            return new Response(JSON.stringify({ error: "Şu anda işlem tamamlanamadı. Daha sonra tekrar deneyin." }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
            })
        }
        if (mayRequestReset !== true) return genericResponse()

        const cleanupCutoff = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString()
        const { error: cleanupError } = await adminClient
            .from("password_reset_rate_limits")
            .delete()
            .lt("last_requested_at", cleanupCutoff)
        if (cleanupError) console.warn("Old password reset rate limit rows could not be cleaned.")

        const { data: registeredUser, error: lookupError } = await adminClient
            .from("users")
            .select("id")
            .eq("email", email)
            .maybeSingle()

        if (lookupError) {
            console.error("Password reset allowlist lookup failed:", lookupError.message)
            return new Response(JSON.stringify({ error: "Şu anda işlem tamamlanamadı. Daha sonra tekrar deneyin." }), {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
            })
        }

        // Keep the response identical whether the address is registered or not.
        if (!registeredUser) return genericResponse()

        const authClient = createClient(supabaseUrl, anonKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        })
        const { error: resetError } = await authClient.auth.resetPasswordForEmail(email, {
            redirectTo: `${origin}/reset-password`,
        })
        if (resetError) {
            console.error("Password reset request failed:", resetError.message)
            return new Response(JSON.stringify({ error: "Şu anda işlem tamamlanamadı. Daha sonra tekrar deneyin." }), {
                status: 502,
                headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
            })
        }

        return genericResponse()
    } catch (error) {
        const bodyError = requestBodyErrorResponse(error, corsHeaders)
        if (bodyError) return bodyError
        console.error("Password reset request could not be processed:", error instanceof Error ? error.message : "Unknown error")
        return new Response(JSON.stringify({ error: "Şu anda işlem tamamlanamadı. Daha sonra tekrar deneyin." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
        })
    }
})
