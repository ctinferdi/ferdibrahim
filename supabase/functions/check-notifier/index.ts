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
        users!checks_user_id_fkey (
          id,
          notification_emails
        ),
        projects (
          name
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

        for (const check of checks) {
            const ownerEmails = check.users?.notification_emails || []
            const specificEmail = check.notification_email

            const recipients = new Set<string>([...ownerEmails])
            if (specificEmail) recipients.add(specificEmail)

            if (recipients.size === 0) {
                console.log(`No recipients for check ${check.check_number}`)
                continue
            }

            const recipientList = Array.from(recipients)

            // Sending email via Resend (assuming configured)
            if (RESEND_API_KEY) {
                const emailRes = await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${RESEND_API_KEY}`,
                    },
                    body: JSON.stringify({
                        from: 'InsaatHesapp <noreply@insaathesapp.com>',
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
