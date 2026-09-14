import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''

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

        if (!res.ok) {
            const errText = await res.text()
            console.error('Resend error:', errText)
            return false
        }
        return true
    } catch (err) {
        console.error('Resend fetch error:', err)
        return false
    }
}

// Get current date string in Europe/Istanbul timezone (YYYY-MM-DD)
const getTodayTurkeyDate = (): string => {
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Istanbul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    })
    return formatter.format(now)
}

// Difference in calendar days (dueDate - today)
const getDaysDifference = (todayStr: string, dueDateStr: string): number => {
    const d1 = new Date(`${todayStr}T00:00:00Z`)
    const d2 = new Date(`${dueDateStr}T00:00:00Z`)
    const diffTime = d2.getTime() - d1.getTime()
    return Math.round(diffTime / (1000 * 60 * 60 * 24))
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
                'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
            }
        })
    }

    try {
        const supabase = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const todayStr = getTodayTurkeyDate()
        console.log(`[check-notifier] Running on ${todayStr} (Turkey Time)`)

        // Fetch all pending checks
        const { data: checks, error: checksError } = await supabase
            .from('checks')
            .select('*')
            .eq('status', 'pending')

        if (checksError) throw checksError

        if (!checks || checks.length === 0) {
            return new Response(
                JSON.stringify({ message: 'Bekleyen çek bulunamadı.', today: todayStr }),
                { headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, status: 200 }
            )
        }

        let sentEmailsTotal = 0
        let notifiedChecksCount = 0
        const notificationsReport: any[] = []

        for (const check of checks) {
            if (!check.due_date) continue

            // Collect recipient emails
            const emails = [
                check.notification_email,
                check.notification_email_2,
                check.notification_email_3,
            ].filter((e: string | null) => e && e.trim() !== '') as string[]

            if (emails.length === 0) continue

            // Don't send more than once per calendar day to avoid spamming
            if (check.last_notified_at === todayStr) {
                continue
            }

            const remainingDays = getDaysDifference(todayStr, check.due_date)
            const milestones: string[] = check.notified_milestones || []

            // Determine which notification milestone applies:
            // 1) 15 days window (<= 15 && > 7 and not yet notified for '15d')
            // 2) 7 days window (<= 7 && > 3 and not yet notified for '7d')
            // 3) 3 days window (<= 3 && > 1 and not yet notified for '3d')
            // 4) 1 day left (=== 1 and not yet notified for '1d')
            // 5) Due day (=== 0 and not yet notified for '0d')
            let currentMilestone: string | null = null
            let alertBadge = ''
            let alertMessage = ''

            if (remainingDays <= 15 && remainingDays > 7 && !milestones.includes('15d')) {
                currentMilestone = '15d'
                alertBadge = `⏰ VADEYE ${remainingDays} GÜN KALDI`
                alertMessage = `Vadesine <strong>${remainingDays} gün</strong> kalan bir çek ödemeniz bulunmaktadır:`
            } else if (remainingDays <= 7 && remainingDays > 3 && !milestones.includes('7d')) {
                currentMilestone = '7d'
                alertBadge = `⏰ VADEYE ${remainingDays} GÜN KALDI`
                alertMessage = `Vadesine <strong>${remainingDays} gün</strong> kalan bir çek ödemeniz bulunmaktadır:`
            } else if (remainingDays <= 3 && remainingDays > 1 && !milestones.includes('3d')) {
                currentMilestone = '3d'
                alertBadge = `⚠️ DİKKAT: VADEYE ${remainingDays} GÜN KALDI`
                alertMessage = `Vadesine sadece <strong>${remainingDays} gün</strong> kalan bir çek ödemeniz bulunmaktadır:`
            } else if (remainingDays === 1 && !milestones.includes('1d')) {
                currentMilestone = '1d'
                alertBadge = `🚨 DİKKAT: VADEYE 1 GÜN KALDI (YARIN)`
                alertMessage = `Vadesine <strong>1 gün (YARIN)</strong> kalan bir çek ödemeniz bulunmaktadır!`
            } else if (remainingDays === 0 && !milestones.includes('0d')) {
                currentMilestone = '0d'
                alertBadge = `🚨 BUGÜN SON ÖDEME GÜNÜ!`
                alertMessage = `<strong>BUGÜN</strong> vadesi gelen bir çek ödemeniz bulunmaktadır!`
            }

            if (!currentMilestone) {
                continue
            }

            // Project name
            let projectName = '-'
            if (check.project_id) {
                const { data: proj } = await supabase
                    .from('projects')
                    .select('name')
                    .eq('id', check.project_id)
                    .single()
                if (proj?.name) projectName = proj.name
            }

            const dueDateFormatted = new Date(check.due_date).toLocaleDateString('tr-TR')
            const amountFormatted = new Intl.NumberFormat('tr-TR').format(check.amount) + ' ₺'

            const emailHtml = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
                <div style="background: #4f46e5; color: white; padding: 14px 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
                    <h2 style="margin: 0; font-size: 18px; letter-spacing: 0.5px;">${alertBadge}</h2>
                </div>
                <p style="font-size: 15px; color: #334155;">Merhaba,</p>
                <p style="font-size: 15px; color: #334155;">${alertMessage}</p>
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
                    <p style="margin: 6px 0; font-size: 15px;"><strong>Vade Tarihi:</strong> <span style="color: #dc2626; font-weight: 800; font-size: 16px;">${dueDateFormatted}</span></p>
                    <p style="margin: 6px 0; font-size: 15px;"><strong>Kalan Süre:</strong> <span style="color: #4f46e5; font-weight: 700;">${remainingDays === 0 ? 'Bugün' : remainingDays === 1 ? 'Yarın (1 Gün)' : `${remainingDays} Gün Kaldı`}</span></p>
                    <p style="margin: 6px 0; font-size: 15px;"><strong>Tutar:</strong> <span style="font-size: 20px; font-weight: 800; color: #0f172a;">${amountFormatted}</span></p>
                    <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0;">
                    <p style="margin: 6px 0; font-size: 14px; color: #475569;"><strong>Şirket:</strong> ${check.company || '-'}</p>
                    <p style="margin: 6px 0; font-size: 14px; color: #475569;"><strong>Çek No:</strong> ${check.check_number || '-'}</p>
                    <p style="margin: 6px 0; font-size: 14px; color: #475569;"><strong>Kullanım Alanı:</strong> ${check.category || '-'}</p>
                    <p style="margin: 6px 0; font-size: 14px; color: #475569;"><strong>Proje:</strong> ${projectName}</p>
                    <p style="margin: 6px 0; font-size: 14px; color: #475569;"><strong>Çeki Veren:</strong> ${check.issuer || '-'}</p>
                </div>
                <div style="text-align: center; margin-top: 25px;">
                    <a href="https://www.insaathesapp.com/cekler" style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 6px; font-weight: 700; font-size: 14px;">Çek Yönetimine Git</a>
                </div>
                <p style="color: #94a3b8; font-size: 12px; margin-top: 30px; text-align: center;">
                    Bu e-posta İnşaat Yönetim sistemi tarafından otomatik olarak gönderilmiştir.
                </p>
            </div>
            `

            const subject = `${alertBadge}: ${check.company || 'Çek'} (${amountFormatted}) - Vade: ${dueDateFormatted}`
            const ok = await sendEmail(emails, subject, emailHtml)

            if (ok) {
                sentEmailsTotal += emails.length
                notifiedChecksCount++

                // Update check record in database
                const updatedMilestones = Array.from(new Set([...milestones, currentMilestone]))
                await supabase
                    .from('checks')
                    .update({
                        last_notified_at: todayStr,
                        notified_milestones: updatedMilestones
                    })
                    .eq('id', check.id)

                notificationsReport.push({
                    checkId: check.id,
                    checkNumber: check.check_number,
                    company: check.company,
                    milestone: currentMilestone,
                    remainingDays,
                    emails
                })
            }
        }

        return new Response(
            JSON.stringify({
                success: true,
                today: todayStr,
                notifiedChecksCount,
                sentEmailsTotal,
                notificationsReport
            }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                status: 200
            }
        )
    } catch (error: any) {
        console.error('check-notifier error:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                status: 500
            }
        )
    }
})
