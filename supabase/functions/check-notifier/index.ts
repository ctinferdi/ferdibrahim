import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const FONNTE_TOKEN = Deno.env.get('FONNTE_TOKEN') ?? ''
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''

const toLocalNumber = (phone: string): { target: string; countryCode: string } => {
    const digits = phone.replace(/\D/g, '')
    if (digits.startsWith('90') && digits.length === 12) return { target: digits.slice(2), countryCode: '90' }
    if (digits.startsWith('0') && digits.length === 11) return { target: digits.slice(1), countryCode: '90' }
    if (digits.startsWith('5') && digits.length === 10) return { target: digits, countryCode: '90' }
    return { target: digits, countryCode: '90' }
}

const sendFonnte = async (phone: string, message: string): Promise<boolean> => {
    const { target, countryCode } = toLocalNumber(phone)
    if (!target || target.length < 9) return false

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
            console.error('Fonnte send failed:', { phone, reason: body?.reason ?? `HTTP ${res.status}` })
            return false
        }

        return true
    } catch (err) {
        console.error('Fonnte fetch error:', err)
        return false
    }
}

const sendEmail = async (emails: string[], subject: string, html: string): Promise<boolean> => {
    if (!RESEND_API_KEY || emails.length === 0) return false

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

        return res.ok
    } catch (err) {
        console.error('Resend fetch error:', err)
        return false
    }
}

serve(async () => {
    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const tenDaysFromNow = new Date()
        tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10)
        const targetDate = tenDaysFromNow.toISOString().split('T')[0]

        console.log(`Checking for checks due on: ${targetDate}`)

        const { data: checks, error: checksError } = await supabase
            .from('checks')
            .select('*')
            .eq('due_date', targetDate)
            .eq('status', 'pending')

        if (checksError) throw checksError

        console.log(`Found ${checks?.length ?? 0} checks due in 10 days.`)

        if (!checks || checks.length === 0) {
            return new Response(
                JSON.stringify({ message: 'Vadesi 10 gün içinde olan çek yok.' }),
                { headers: { 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        let sentSms = 0
        let sentEmail = 0
        let failedSms = 0
        let failedEmail = 0

        for (const check of checks) {
            const projectName = check.project_id
                ? (await supabase.from('projects').select('name').eq('id', check.project_id).single()).data?.name ?? '-'
                : '-'
            const dueDateFormatted = new Date(check.due_date).toLocaleDateString('tr-TR')
            const amountFormatted = new Intl.NumberFormat('tr-TR').format(check.amount) + ' ₺'

            const whatsappMessage = `⏰ *ÇEK VADE HATIRLATMASI*

Çek No: ${check.check_number || '-'}
Vade Tarihi: ${dueDateFormatted}
Tutar: ${amountFormatted}
Şirket: ${check.company || '-'}
Kullanım: ${check.category || '-'}
Proje: ${projectName}

*Vadeye 10 gün kaldı.*`

            const emailHtml = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #4338ca; border-bottom: 2px solid #4338ca; padding-bottom: 10px;">⏰ Çek Vade Hatırlatması</h2>
                <p>Merhaba,</p>
                <p>Vadesine 10 gün kalan bir çek ödemeniz bulunmaktadır:</p>
                <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Vade Tarihi:</strong> <span style="color: #dc2626; font-weight: bold;">${dueDateFormatted}</span></p>
                    <p style="margin: 5px 0;"><strong>Tutar:</strong> <span style="font-size: 18px; font-weight: bold;">${amountFormatted}</span></p>
                    <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 15px 0;">
                    <p style="margin: 5px 0;"><strong>Şirket:</strong> ${check.company || '-'}</p>
                    <p style="margin: 5px 0;"><strong>Çek No:</strong> ${check.check_number || '-'}</p>
                    <p style="margin: 5px 0;"><strong>Kullanım Alanı:</strong> ${check.category || '-'}</p>
                    <p style="margin: 5px 0;"><strong>Proje:</strong> ${projectName}</p>
                    <p style="margin: 5px 0;"><strong>Çeki Veren:</strong> ${check.issuer || '-'}</p>
                </div>
                <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
                    Bu e-posta sistem tarafından otomatik olarak gönderilmiştir.
                </p>
            </div>
            `

            // Handle WhatsApp
            const phones = [
                check.notification_phone,
                check.notification_phone_2,
                check.notification_phone_3,
            ].filter((p: string | null) => p && p.trim() !== '') as string[]

            for (const phone of phones) {
                const ok = await sendFonnte(phone, whatsappMessage)
                ok ? sentSms++ : failedSms++
            }

            // Handle Email
            const emails = [
                check.notification_email,
                check.notification_email_2,
                check.notification_email_3,
            ].filter((e: string | null) => e && e.trim() !== '') as string[]

            if (emails.length > 0) {
                const ok = await sendEmail(emails, `⏰ ÇEK VADE HATIRLATMASI: ${dueDateFormatted}`, emailHtml)
                ok ? sentEmail += emails.length : failedEmail += emails.length
            }
        }

        return new Response(
            JSON.stringify({ 
                message: 'Bildirimler işlendi', 
                whatsapp: { sent: sentSms, failed: failedSms },
                email: { sent: sentEmail, failed: failedEmail }
            }),
            { headers: { 'Content-Type': 'application/json' }, status: 200 }
        )

    } catch (error: any) {
        console.error('check-notifier error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { headers: { 'Content-Type': 'application/json' }, status: 500 }
        )
    }
})
