import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        // 1. Get checks due in 10 days
        const tenDaysFromNow = new Date()
        tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10)
        const tenDaysStr = tenDaysFromNow.toISOString().split('T')[0]

        console.log(`Checking for checks due on: ${tenDaysStr}`)

        const { data: checks, error: checksError } = await supabase
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
            .eq('due_date', tenDaysStr)
            .eq('status', 'pending')

        if (checksError) throw checksError

        console.log(`Found ${checks?.length || 0} checks due in 10 days.`)

        if (!checks || checks.length === 0) {
            return new Response(JSON.stringify({ message: 'No checks due in 10 days.' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // 2. Process and send emails
        const notifications = []
        const DEFAULT_NOTIFICATION_EMAIL = "ctinferdi@gmail.com"

        for (const check of checks) {
            const projectEmails = check.projects?.notification_emails || []
            const userEmails = check.user?.notification_emails || []
            const specificEmailsStr = check.notification_email

            const recipients = new Set<string>([...projectEmails, ...userEmails])

            if (specificEmailsStr) {
                // Support multiple comma separated emails
                const extraEmails = specificEmailsStr.split(',').map((e: string) => e.trim()).filter((e: string) => e)
                extraEmails.forEach((e: string) => recipients.add(e))
            }

            // If no recipients, fallback to default
            if (recipients.size === 0) {
                recipients.add(DEFAULT_NOTIFICATION_EMAIL)
            }

            const recipientList = Array.from(recipients)

            // Sending email via Resend
            if (RESEND_API_KEY) {
                console.log(`Sending notification for check ${check.check_number} to: ${recipientList.join(', ')}`)
                const emailRes = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${RESEND_API_KEY}`,
                    },
                    body: JSON.stringify({
                        from: 'InsaatHesapp <onboarding@resend.dev>',
                        to: recipientList,
                        subject: `Çek Ödeme Hatırlatıcısı: ${check.check_number}`,
                        html: `
              <h2>Çek Ödeme Hatırlatması</h2>
              <p>Merhaba, aşağıdaki çekin ödeme tarihine 10 gün kalmıştır:</p>
              <ul>
                <li><strong>Çek Numarası:</strong> ${check.check_number}</li>
                <li><strong>Vade Tarihi:</strong> ${check.due_date}</li>
                <li><strong>Tutar:</strong> ${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(check.amount)}</li>
                <li><strong>Şirket/Kişi:</strong> ${check.company}</li>
                <li><strong>Proje:</strong> ${check.projects?.name || 'Belirtilmemiş'}</li>
              </ul>
              <p>Lütfen gerekli kontrolleri yapınız.</p>
              <br/>
              <p><em>Bu otomatik bir bildirimdir.</em></p>
            `,
                    }),
                })

                if (!emailRes.ok) {
                    const err = await emailRes.text()
                    console.error(`Error sending email to ${recipientList.join(', ')}:`, err)
                } else {
                    notifications.push({ check_id: check.id, sent_to: recipientList })
                }
            } else {
                console.warn('RESEND_API_KEY not set. Skipping email send.')
                notifications.push({ check_id: check.id, status: 'RESEND_API_KEY_MISSING', recipients: recipientList })
            }
        }

        return new Response(JSON.stringify({
            message: 'Notifications processed',
            processed: notifications.length,
            details: notifications
        }), {
            headers: { 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
