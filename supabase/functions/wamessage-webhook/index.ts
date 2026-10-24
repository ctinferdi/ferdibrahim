import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
})

const constantTimeEqual = (left: string, right: string): boolean => {
    const encoder = new TextEncoder()
    const a = encoder.encode(left)
    const b = encoder.encode(right)
    let difference = a.length ^ b.length
    const length = Math.max(a.length, b.length)

    for (let i = 0; i < length; i += 1) {
        difference |= (a[i] ?? 0) ^ (b[i] ?? 0)
    }

    return difference === 0
}

const stringField = (value: unknown): string | undefined =>
    typeof value === "string" && value.length <= 100 ? value : undefined

serve(async (request) => {
    if (request.method === "GET") {
        return json({ ready: true, receiver: "wamessage-webhook", mode: "inspect-only" })
    }

    if (request.method !== "POST") {
        return json({ error: "POST is required." }, 405)
    }

    const expectedSecret = Deno.env.get("WAMESSAGE_WEBHOOK_SECRET")
    if (!expectedSecret) {
        return json({ error: "Webhook secret is not configured." }, 503)
    }

    const providedSecret = request.headers.get("X-Webhook-Secret") ?? ""
    if (!constantTimeEqual(providedSecret, expectedSecret)) {
        return json({ error: "Invalid webhook secret." }, 401)
    }

    let payload: unknown
    try {
        payload = await request.json()
    } catch {
        return json({ error: "A JSON request body is required." }, 400)
    }

    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return json({ error: "The webhook body must be a JSON object." }, 400)
    }

    const body = payload as Record<string, unknown>
    const data = body.data && typeof body.data === "object" && !Array.isArray(body.data)
        ? body.data as Record<string, unknown>
        : undefined
    const message = data?.message && typeof data.message === "object" && !Array.isArray(data.message)
        ? data.message as Record<string, unknown>
        : undefined

    // Inspect only the event shape. Message text, phone numbers, and full payloads
    // are deliberately neither persisted nor written to logs at this stage.
    return json({
        received: true,
        mode: "inspect-only",
        event: stringField(body.event) ?? stringField(body.type) ?? "unknown",
        topLevelKeys: Object.keys(body).slice(0, 30),
        dataKeys: data ? Object.keys(data).slice(0, 30) : [],
        messageKeys: message ? Object.keys(message).slice(0, 30) : [],
        hasText: Boolean(
            (typeof message?.text === "string" && message.text.length > 0) ||
            (typeof data?.text === "string" && data.text.length > 0) ||
            (typeof body.text === "string" && body.text.length > 0)
        ),
    })
})
