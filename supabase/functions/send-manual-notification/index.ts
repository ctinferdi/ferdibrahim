import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const FONNTE_TOKEN = Deno.env.get('FONNTE_TOKEN') ?? ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''

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

    try {
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
            console.error('Fonnte error:', { phone, error: errMsg })
            return { ok: false, error: `Fonnte: ${errMsg}` }
        }

        return { ok: true }
    } catch (err) {
        return { ok: false, error: `Fetch error: ${err.message}` }
    }
}

const sendEmail = async (emails: string[], subject: string, html: string): Promise<{ ok: boolean; error?: string }> => {
    if (!RESEND_API_KEY || emails.length === 0) return { ok: false, error: 'Resend API key missing or no emails.' }

    try {
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'InsaatHesapp <onboarding@resend.dev>',
                to: emails,
                subject,
                html,
            }),
        })

        if (!res.ok) {
            const err = await res.text()
            return { ok: false, error: `Resend: ${err}` }
        }

        return { ok: true }
    } catch (err) {
        return { ok: false, error: `Email fetch error: ${err.message}` }
    }
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

        const emails = [
            check.notification_email,
            check.notification_email_2,
            check.notification_email_3,
        ].filter((e: string | null) => e && e.trim() !== '') as string[]

        if (phones.length === 0 && emails.length === 0) {
            throw new Error('Bu çeke tanımlı WhatsApp numarası veya e-posta adresi yok. Çeki düzenleyip bilgi ekleyin.')
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

        const whatsappMessage = `📋 *ÇEK ÖDEME BİLDİRİMİ*

Çek No: ${check.check_number || '-'}
Vade Tarihi: ${dueDateFormatted}
Tutar: ${amountFormatted}
Şirket: ${check.company || '-'}
Kullanım: ${check.category || '-'}
Proje: ${projectName}

Bu bildirimi manuel olarak tetiklediniz.`

        const emailHtml = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #4338ca; border-bottom: 2px solid #4338ca; padding-bottom: 10px;">📋 Çek Ödeme Bildirimi</h2>
            <p>Merhaba,</p>
            <p>Aşağıdaki çek kaydı için bir ödeme bildirimi gönderilmiştir:</p>
            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Vade Tarihi:</strong> <span style="font-weight: bold;">${dueDateFormatted}</span></p>
                <p style="margin: 5px 0;"><strong>Tutar:</strong> <span style="font-size: 18px; font-weight: bold;">${amountFormatted}</span></p>
                <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 15px 0;">
                <p style="margin: 5px 0;"><strong>Şirket:</strong> ${check.company || '-'}</p>
                <p style="margin: 5px 0;"><strong>Çek No:</strong> ${check.check_number || '-'}</p>
                <p style="margin: 5px 0;"><strong>Kullanım Alanı:</strong> ${check.category || '-'}</p>
                <p style="margin: 5px 0;"><strong>Proje:</strong> ${projectName}</p>
                <p style="margin: 5px 0;"><strong>Çeki Veren:</strong> ${check.issuer || '-'}</p>
            </div>
            <p style="color: #6b7280; font-size: 11px;">* Bu bildirim manuel olarak tetiklenmiştir.</p>
        </div>
        `

        let sentSms = 0
        let sentEmailCount = 0
        const errors: string[] = []

        for (const phone of phones) {
            const result = await sendFonnte(phone, whatsappMessage)
            if (result.ok) sentSms++
            else if (result.error) errors.push(result.error)
        }

        if (emails.length > 0) {
            const result = await sendEmail(emails, `📋 ÇEK ÖDEME BİLDİRİMİ: ${dueDateFormatted}`, emailHtml)
            if (result.ok) sentEmailCount = emails.length
            else if (result.error) errors.push(result.error)
        }

        if (sentSms === 0 && sentEmailCount === 0) {
            throw new Error(errors.length > 0 ? errors[0] : 'Bildirimler gönderilemedi.')
        }

        return new Response(
            JSON.stringify({ success: true, sentSms, sentEmail: sentEmailCount }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
    }
})
