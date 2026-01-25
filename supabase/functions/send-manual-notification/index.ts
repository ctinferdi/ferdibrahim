import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

        // 1. Get check details
        const { data: check, error: checkError } = await supabase
            .from('checks')
            .select('*, projects(name)')
            .eq('id', checkId)
            .single()

        if (checkError || !check) throw new Error(`Check not found: ${checkError?.message}`)

        // 2. Prepare recipients
        // IMPORTANT: Resend onboarding@resend.dev ONLY works for the owner's email
        const recipientList = ["ctinferdi@gmail.com"]

        // 3. Send email via Resend
        if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not configured')

        // Try multiple field names for check number just in case
        const checkNum = check.check_number || check.check_no || '---'
        const projectName = check.projects?.name || 'Belirtilmemiş'

        console.log(`Sending manual notification for check ${checkNum} to ${recipientList[0]}`)

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
            <p>Merhaba kanka, bu bir manuel test/hatırlatma bildirilmiştir.</p>
            <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Çek Numarası:</strong> ${checkNum}</p>
              <p><strong>Vade Tarihi:</strong> ${check.due_date}</p>
              <p><strong>Tutar:</strong> ${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(check.amount)}</p>
              <p><strong>Şirket/Kişi:</strong> ${check.company}</p>
              <p><strong>Proje:</strong> ${projectName}</p>
            </div>
            <p style="color: #64748b; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px;">
              Not: Şu an deneme modunda olduğumuz için tüm bildirimler ctinferdi@gmail.com adresine yönlendirilmektedir. <br/>
              Tanımladığın mail adresleri: ${[check.notification_email, check.notification_email_2, check.notification_email_3].filter(e => e).join(', ') || 'Seçilmedi'}
            </p>
          </div>
        `,
            }),
        })

        const resBody = await emailRes.text()
        if (!emailRes.ok) throw new Error(`Resend Error: ${resBody}`)

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    }
})
