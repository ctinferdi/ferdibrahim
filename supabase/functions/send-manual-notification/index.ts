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

        // 1. Get check details
        console.log(`Step 1: Fetching check ${checkId}`)
        const { data: check, error: checkError } = await supabase
            .from('checks')
            .select('*')
            .eq('id', checkId)
            .single()

        if (checkError) throw new Error(`Fetch check database error: ${checkError.message}`)
        if (!check) throw new Error(`Check not found with ID: ${checkId}`)

        console.log('Check data found:', JSON.stringify(check))

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
        const recipients = new Set<string>()

        // Add project emails
        if (project?.notification_emails && Array.isArray(project.notification_emails)) {
            project.notification_emails.forEach(e => { if (e) recipients.add(e.trim()) })
        }

        // Add specific check notification email
        if (check.notification_email) {
            const extraEmails = check.notification_email.split(',').map((e: string) => e?.trim()).filter((e: string) => e)
            extraEmails.forEach((e: string) => recipients.add(e))
        }

        // Add user notification emails if we have them (check has user_id, but joining users table is extra work now)
        // Fallback to defaults
        if (recipients.size === 0) {
            recipients.add("ctinferdi@gmail.com")
        }

        const recipientList = Array.from(recipients).filter(e => e && e.includes('@'))
        console.log(`Targeting recipients: ${recipientList.join(', ')}`)

        // 4. Send email via Resend
        if (!RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY environment variable is missing')
        }

        const checkNum = check.check_number || 'Belirtilmemiş'

        console.log(`Sending manual notification for check ${checkNum} via Resend...`)

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
            <p style="color: #64748b; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
              Bu e-posta sistem üzerinden manuel olarak tetiklenmiştir. <br/><br/>
              <strong>📌 Not:</strong> Şu an deneme modunda olduğumuz için e-postalar ulaşmıyorsa, alıcı adresin doğrulanmış olması gerekebilir.
            </p>
          </div>
        `,
            }),
        })

        const resBody = await emailRes.text()
        console.log('Resend Response Status:', emailRes.status)
        console.log('Resend Response Body:', resBody)

        if (!emailRes.ok) {
            // Return the specific Resend error instead of a generic 500
            return new Response(JSON.stringify({
                error: `Resend API Error (Status ${emailRes.status}): ${resBody}`,
                details: resBody
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400, // Return 400 so client knows it's a "known" failure
            })
        }

        return new Response(JSON.stringify({ message: 'Email sent successfully', recipients: recipientList }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error('Final Catch Error:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 500,
        })
    }
})
