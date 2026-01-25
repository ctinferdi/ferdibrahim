import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { checkId } = await req.json()

        if (!checkId) {
            throw new Error('checkId is required')
        }

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Get check details
        const { data: check, error: checkError } = await supabase
            .from('checks')
            .select(`
                *,
                projects (
                  name,
                  notification_emails
                ),
                user:users (
                  notification_emails
                )
            `)
            .eq('id', checkId)
            .single()

        if (checkError || !check) {
            throw new Error('Check not found')
        }

        // 2. Prepare recipients
        const projectEmails = check.projects?.notification_emails || []
        const userEmails = check.user?.notification_emails || []
        const specificEmailsStr = check.notification_email

        const recipients = new Set<string>([...projectEmails, ...userEmails])

        if (specificEmailsStr) {
            const extraEmails = specificEmailsStr.split(',').map((e: string) => e.trim()).filter((e: string) => e)
            extraEmails.forEach((e: string) => recipients.add(e))
        }

        if (recipients.size === 0) {
            // Default fallback if no emails defined anywhere
            recipients.add("ctinferdi@gmail.com")
        }

        const recipientList = Array.from(recipients)

        // 3. Send email via Resend
        if (!RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY is not configured')
        }

        console.log(`Sending manual notification for check ${check.check_number} to: ${recipientList.join(', ')}`)

        const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'InsaatHesapp <onboarding@resend.dev>',
                to: recipientList,
                subject: `MANUEL HATIRLATMA: Çek Ödeme Hatırlatıcısı (${check.check_number})`,
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Çek Ödeme Hatırlatması</h2>
            <p>Merhaba, bu bir manuel test/hatırlatma bildirilmiştir.</p>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Çek Numarası:</strong> ${check.check_number}</p>
              <p><strong>Vade Tarihi:</strong> ${check.due_date}</p>
              <p><strong>Tutar:</strong> ${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(check.amount)}</p>
              <p><strong>Şirket/Kişi:</strong> ${check.company}</p>
              <p><strong>Proje:</strong> ${check.projects?.name || 'Belirtilmemiş'}</p>
            </div>
            <p style="color: #64748b; font-size: 12px; margin-top: 30px;">
              Bu e-posta sistem üzerinden manuel olarak tetiklenmiştir.
            </p>
          </div>
        `,
            }),
        })

        if (!emailRes.ok) {
            const err = await emailRes.text()
            throw new Error(`Resend Error: ${err}`)
        }

        return new Response(JSON.stringify({ message: 'Email sent successfully' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error('Function Error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
