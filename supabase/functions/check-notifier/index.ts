import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const FONNTE_TOKEN = Deno.env.get('FONNTE_TOKEN') ?? ''

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
            console.error('Fonnte send failed:', { phone: normalized, reason: body?.reason ?? `HTTP ${res.status}` })
            return false
        }

        return true
    } catch (err) {
        console.error('Fonnte fetch error:', err)
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

        let sent = 0
        let failed = 0

        for (const check of checks) {
            const projectName = check.project_id
                ? (await supabase.from('projects').select('name').eq('id', check.project_id).single()).data?.name ?? '-'
                : '-'
            const dueDateFormatted = new Date(check.due_date).toLocaleDateString('tr-TR')
            const amountFormatted = new Intl.NumberFormat('tr-TR').format(check.amount) + ' ₺'

            const message = `⏰ *ÇEK VADE HATIRLATMASI*

Çek No: ${check.check_number || '-'}
Vade Tarihi: ${dueDateFormatted}
Tutar: ${amountFormatted}
Şirket: ${check.company || '-'}
Kullanım: ${check.category || '-'}
Proje: ${projectName}

*Vadeye 10 gün kaldı.*`

            const phones = [
                check.notification_phone,
                check.notification_phone_2,
                check.notification_phone_3,
            ].filter((p: string | null) => p && p.trim() !== '') as string[]

            if (phones.length === 0) {
                console.warn(`Check ${check.check_number} has no notification phones, skipping.`)
                continue
            }

            for (const phone of phones) {
                const ok = await sendFonnte(phone, message)
                ok ? sent++ : failed++
            }
        }

        return new Response(
            JSON.stringify({ message: 'Bildirimler işlendi', sent, failed }),
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
