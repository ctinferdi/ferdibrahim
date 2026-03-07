import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_TOKEN') ?? ''
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? ''
const WHATSAPP_TEMPLATE_NAME = Deno.env.get('WHATSAPP_TEMPLATE_NAME') ?? 'cek_odeme_hatirlatmasi'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const normalizePhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, '')
    if (digits.startsWith('90') && digits.length === 12) return digits
    if (digits.startsWith('0') && digits.length === 11) return '90' + digits.substring(1)
    if (digits.startsWith('5') && digits.length === 10) return '90' + digits
    return digits
}

const sendWhatsApp = async (phone: string, params: string[]): Promise<{ ok: boolean; error?: string }> => {
    const normalized = normalizePhone(phone)
    if (!normalized || normalized.length < 10) return { ok: false, error: `Geçersiz telefon: ${phone}` }

    const res = await fetch(
        `https://graph.facebook.com/v19.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to: normalized,
                type: 'template',
                template: {
                    name: WHATSAPP_TEMPLATE_NAME,
                    language: { code: 'tr' },
                    components: [{
                        type: 'body',
                        parameters: params.map(text => ({ type: 'text', text })),
                    }],
                },
            }),
        }
    )

    if (!res.ok) {
        const errText = await res.text()
        console.error('WhatsApp API error:', { phone: normalized, status: res.status, body: errText })
        return { ok: false, error: `Meta API ${res.status}: ${errText}` }
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
            .select('*, projects(name)')
            .eq('id', checkId)
            .single()

        if (checkError || !check) throw new Error(`Check not found: ${checkError?.message}`)

        const phones = [
            check.notification_phone,
            check.notification_phone_2,
            check.notification_phone_3,
        ].filter((p: string | null) => p && p.trim() !== '') as string[]

        if (phones.length === 0) {
            throw new Error('Bu çeke tanımlı WhatsApp numarası yok. Çeki düzenleyip numara ekleyin.')
        }

        const projectName = check.projects?.name ?? 'Proje'
        const params = [
            check.check_number || '-',
            check.due_date,
            new Intl.NumberFormat('tr-TR').format(check.amount) + ' TL',
            check.company || '-',
            projectName,
        ]

        let sent = 0
        let failed = 0
        const errors: string[] = []
        for (const phone of phones) {
            const result = await sendWhatsApp(phone, params)
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
