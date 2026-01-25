import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: corsHeaders
        })
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

        // 1. Get check details (simplified)
        console.log(`Step 1: Fetching check ${checkId}`)
        const { data: check, error: checkError } = await supabase
            .from('checks')
            .select('*')
            .eq('id', checkId)
            .single()

        if (checkError) throw new Error(`Fetch check error: ${checkError.message}`)
        if (!check) throw new Error('Check not found')

        console.log('Check data fetched:', JSON.stringify(check))

        // 2. Get project details separately
        let project = null
        if (check.project_id) {
            console.log(`Step 2: Fetching project ${check.project_id}`)
            const { data: pData, error: pError } = await supabase
                .from('projects')
                .select('name, notification_emails')
                .eq('id', check.project_id)
                .single()
            if (!pError) project = pData
        }

        // 3. Prepare recipients
        const projectEmails = project?.notification_emails || []
        const specificEmailsStr = check.notification_email

        const recipients = new Set<string>([...projectEmails])

        if (specificEmailsStr) {
            const extraEmails = specificEmailsStr.split(',').map((e: string) => e.trim()).filter((e: string) => e)
            extraEmails.forEach((e: string) => recipients.add(e))
        }

        if (recipients.size === 0) {
            recipients.add("ctinferdi@gmail.com")
        }

        const recipientList = Array.from(recipients)
        console.log(`Recipients: ${recipientList.join(', ')}`)

        // 4. Send email via Resend
        if (!RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY is not configured')
        }

        const checkNum = check.check_number || check.check_no || 'Belirtilmemiş'

        console.log(`Sending manual notification for check ${checkNum} to: ${recipientList.join(', ')}`)

        const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'InsaatHesapp <onboarding@resend.dev>',
                to: recipientList,
                subject: `MANUEL HATIRLATMA: Çek Ödeme Hatırlatması (${checkNum})`,
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #667eea; border-bottom: 2px solid #667eea; padding-bottom: 10px;">Çek Ödeme Hatırlatması</h2>
            <p>Merhaba, bu bir manuel test/hatırlatma bildirilmiştir.</p>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Çek Numarası:</strong> ${checkNum}</p>
              <p><strong>Vade Tarihi:</strong> ${check.due_date}</p>
              <p><strong>Tutar:</strong> ${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(check.amount)}</p>
              <p><strong>Şirket/Kişi:</strong> ${check.company}</p>
              <p><strong>Proje:</strong> ${project?.name || 'Belirtilmemiş'}</p>
            </div>
            <p style="color: #64748b; font-size: 12px; margin-top: 30px;">
              Bu e-posta sistem üzerinden manuel olarak tetiklenmiştir. <br/>
              <em>Not: onboarding@resend.dev adresi sadece doğrulanmış hesaplara mail gönderebilir. E-posta ulaşmıyorsa alıcı mail Resend üzerinde kayıtlı değildir.</em>
            </p>
          </div>
        `,
            }),
        })

        const resBody = await emailRes.text()
        console.log('Resend response:', resBody)

        if (!emailRes.ok) {
            throw new Error(`Resend Error: ${resBody}`)
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
