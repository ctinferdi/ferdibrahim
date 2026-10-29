import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { readJsonBody, requestBodyErrorResponse } from "../_shared/request-body.ts"
import { isPasswordLengthValid } from "../_shared/passwordPolicy.ts"

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
}

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

    const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
    })

    try {
        const authorization = request.headers.get("Authorization") ?? ""
        const accessToken = authorization.match(/^Bearer\s+(.+)$/i)?.[1]
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? ""
        const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        if (!accessToken || !supabaseUrl || !serviceRoleKey) {
            return response({ error: "Oturum doğrulanamadı." }, 401)
        }

        const adminClient = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false },
        })
        const { data: { user: caller }, error: authError } = await adminClient.auth.getUser(accessToken)
        if (authError || !caller) return response({ error: "Oturum doğrulanamadı." }, 401)

        if (caller.email?.trim().toLowerCase() !== "ctinferdi@gmail.com") {
            return response({ error: "Bu işlem için yönetici yetkisi gerekiyor." }, 403)
        }

        const body = await readJsonBody(request)
        const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
        const password = typeof body?.password === "string" ? body.password : ""
        if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return response({ error: "Geçerli bir e-posta adresi girin." }, 400)
        }
        if (!isPasswordLengthValid(password)) {
            return response({ error: "Şifre en az 12, en fazla 128 karakter olmalı." }, 400)
        }

        const { data, error } = await adminClient.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { role: "admin" },
        })
        if (error) {
            console.error("Admin user creation failed:", error.message)
            return response({ error: error.message.toLowerCase().includes("already")
                ? "Bu e-posta adresi zaten kayıtlı."
                : "Kullanıcı oluşturulamadı. Ayarları kontrol edip tekrar deneyin." }, 400)
        }

        return response({ id: data.user.id, email: data.user.email }, 201)
    } catch (error) {
        const bodyError = requestBodyErrorResponse(error, corsHeaders)
        if (bodyError) return bodyError
        console.error("Admin user creation failed:", error instanceof Error ? error.message : "Unknown error")
        return response({ error: "Kullanıcı oluşturulamadı. Daha sonra tekrar deneyin." }, 500)
    }
})
