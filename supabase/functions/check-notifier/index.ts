import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_TOKEN') ?? ''
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? ''
const WHATSAPP_TEMPLATE_NAME = Deno.env.get('WHATSAPP_TEMPLATE_NAME') ?? 'cek_odeme_hatirlatmasi'

const normalizePhone = (phone: string): string => {
    const digits = phone.replace(/\D/g, '')
    if (digits.startsWith('90') && digits.length === 12) return digits
    if (digits.startsWith('0') && digits.length === 11) return '90' + digits.substring(1)
    if (digits.startsWith('5') && digits.length === 10) return '90' + digits
    return digits
}

const sendWhatsApp = async (phone: string, params: string[]): Promise<boolean> => {
    const normalized = normalizePhone(phone)
    if (!normalized || normalized.length < 10) return false

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
        const err = await res.text()
        console.error('WhatsApp send failed:', { phone: normalized, error: err })
        return false
    }
    return true
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
            .select('*, projects(name)')
            .eq('due_date', targetDate)
            .eq('status', 'pending')

        if (checksError) throw checksError

        console.log(`Found ${checks?.length ?? 0} checks due in 10 days.`)

        if (!checks || checks.length === 0) {
            return new Response(
                JSON.stringify({ message: 'No checks due in 10 days.' }),
                { headers: { 'Content-Type': 'application/json' }, status: 200 }
            )
        }

        let sent = 0
        let failed = 0

        for (const check of checks) {
            const projectName = check.projects?.name ?? 'Proje'
            const params = [
                check.check_number || '-',
                check.due_date,
                new Intl.NumberFormat('tr-TR').format(check.amount) + ' TL',
                check.company || '-',
                projectName,
            ]

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
                const ok = await sendWhatsApp(phone, params)
                ok ? sent++ : failed++
            }
        }

        return new Response(
            JSON.stringify({ message: 'Notifications processed', sent, failed }),
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
