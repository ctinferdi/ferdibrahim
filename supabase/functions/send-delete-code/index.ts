import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const NOTIFICATION_EMAIL = "ctinferdi@gmail.com"

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
        const { targetName, actionType, userEmail } = await req.json()

        // Generate 4-digit code
        const securityCode = Math.floor(1000 + Math.random() * 9000).toString()

        console.log(`Sending delete code ${securityCode} to ${NOTIFICATION_EMAIL} for ${actionType}: ${targetName}`)

        if (!RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY is not configured')
        }

        const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: 'InsaatHesapp <onboarding@resend.dev>',
                to: [NOTIFICATION_EMAIL],
                subject: `GÜVENLİK KODU: ${actionType} İşlemi`,
                html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; borderRadius: 10px;">
            <h2 style="color: #f5576c; borderBottom: 2px solid #f5576c; paddingBottom: 10px;">Silme İşlemi Onayı</h2>
            <p>Merhaba,</p>
            <p>Sistemde kritik bir silme işlemi talep edildi:</p>
            <div style="background: #f9fafb; padding: 15px; borderRadius: 8px; margin: 20px 0;">
              <p><strong>İşlem Tipi:</strong> ${actionType === 'project' ? 'Proje Silme' : 'Kullanıcı Silme'}</p>
              <p><strong>Hedef:</strong> ${targetName}</p>
              <p><strong>Talep Eden:</strong> ${userEmail}</p>
            </div>
            <p style="fontSize: 16px;">Bu işlemi onaylamak için aşağıdaki güvenlik kodunu giriniz:</p>
            <div style="background: #667eea; color: white; padding: 15px 30px; fontSize: 28px; fontWeight: 800; textAlign: center; borderRadius: 8px; letterSpacing: 5px; margin: 20px 0;">
              ${securityCode}
            </div>
            <p style="color: #64748b; fontSize: 12px; marginTop: 30px;">
              Eğer bu işlemi siz yapmadıysanız lütfen hemen şifrenizi değiştiriniz.
            </p>
          </div>
        `,
            }),
        })

        if (!emailRes.ok) {
            const errorText = await emailRes.text()
            console.error('Resend API Error:', errorText)
            return new Response(
                JSON.stringify({ error: `Resend API Error: ${errorText}` }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 400
                }
            )
        }

        return new Response(
            JSON.stringify({ message: 'Email sent', code: securityCode }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )

    } catch (error: any) {
        console.error('Function Error:', error.message)
        return new Response(
            JSON.stringify({ error: `Function Error: ${error.message}` }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            }
        )
    }
})
