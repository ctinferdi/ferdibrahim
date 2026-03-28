import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const FONNTE_TOKEN = Deno.env.get('FONNTE_TOKEN') ?? ''

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const toLocalNumber = (phone: string): { target: string; countryCode: string } => {
    const digits = phone.replace(/\D/g, '')
    if (digits.startsWith('90') && digits.length === 12) return { target: digits.slice(2), countryCode: '90' }
    if (digits.startsWith('0') && digits.length === 11) return { target: digits.slice(1), countryCode: '90' }
    if (digits.startsWith('5') && digits.length === 10) return { target: digits, countryCode: '90' }
    return { target: digits, countryCode: '90' }
}

const sendFonnte = async (phone: string, message: string): Promise<{ ok: boolean; error?: string }> => {
    const { target, countryCode } = toLocalNumber(phone)
    if (!target || target.length < 9) return { ok: false, error: `Geçersiz telefon: ${phone}` }

    const res = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: {
            'Authorization': FONNTE_TOKEN,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            target,
            message,
            countryCode,
        }),
    })

    const body = await res.json().catch(() => ({}))

    if (!res.ok || body?.status === false) {
        const errMsg = body?.reason ?? body?.message ?? `HTTP ${res.status}`
        console.error('Fonnte error:', { phone: normalized, error: errMsg })
        return { ok: false, error: `Fonnte: ${errMsg}` }
    }

    return { ok: true }
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders })
    }

    try {
        const { checkId } = await req.json()
        if (!checkId) throw new Error('checkId is required')

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { data: check, error: checkError } = await supabase
            .from('checks')
            .select('*')
            .eq('id', checkId)
            .single()

        if (checkError || !check) throw new Error(`Çek bulunamadı: ${checkError?.message}`)

        const phones = [
            check.notification_phone,
            check.notification_phone_2,
            check.notification_phone_3,
        ].filter((p: string | null) => p && p.trim() !== '') as string[]

        if (phones.length === 0) {
            throw new Error('Bu çeke tanımlı WhatsApp numarası yok. Çeki düzenleyip numara ekleyin.')
        }

        // Proje adını ayrı çek
        let projectName = '-'
        if (check.project_id) {
            const { data: proj } = await supabase
                .from('projects').select('name').eq('id', check.project_id).single()
            if (proj?.name) projectName = proj.name
        }

        const dueDateFormatted = new Date(check.due_date).toLocaleDateString('tr-TR')
        const amountFormatted = new Intl.NumberFormat('tr-TR').format(check.amount) + ' ₺'

        const message = `📋 *ÇEK ÖDEME BİLDİRİMİ*

Çek No: ${check.check_number || '-'}
Vade Tarihi: ${dueDateFormatted}
Tutar: ${amountFormatted}
Şirket: ${check.company || '-'}
Kullanım: ${check.category || '-'}
Proje: ${projectName}

Bu bildirimi manuel olarak tetiklediniz.`

        let sent = 0
        let failed = 0
        const errors: string[] = []

        for (const phone of phones) {
            const result = await sendFonnte(phone, message)
            if (result.ok) {
                sent++
            } else {
                failed++
                if (result.error) errors.push(result.error)
            }
        }

        if (sent === 0) throw new Error(errors.length > 0 ? errors[0] : 'Tüm WhatsApp mesajları gönderilemedi.')

        return new Response(
            JSON.stringify({ success: true, sent, failed }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    }
})
