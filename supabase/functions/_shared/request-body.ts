export class RequestBodyError extends Error {
    readonly status: number

    constructor(message: string, status: number) {
        super(message)
        this.name = "RequestBodyError"
        this.status = status
    }
}

export async function readJsonBody(request: Request, maxBytes = 16 * 1024): Promise<unknown> {
    const contentLength = request.headers.get("content-length")
    if (contentLength && Number(contentLength) > maxBytes) {
        throw new RequestBodyError("İstek boyutu izin verilen sınırı aşıyor.", 413)
    }
    if (!request.body) throw new RequestBodyError("Geçerli bir JSON gövdesi gerekli.", 400)

    const reader = request.body.getReader()
    const chunks: Uint8Array[] = []
    let totalBytes = 0

    try {
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            totalBytes += value.byteLength
            if (totalBytes > maxBytes) {
                await reader.cancel()
                throw new RequestBodyError("İstek boyutu izin verilen sınırı aşıyor.", 413)
            }
            chunks.push(value)
        }
    } finally {
        reader.releaseLock()
    }

    const bytes = new Uint8Array(totalBytes)
    let offset = 0
    for (const chunk of chunks) {
        bytes.set(chunk, offset)
        offset += chunk.byteLength
    }

    try {
        return JSON.parse(new TextDecoder().decode(bytes))
    } catch {
        throw new RequestBodyError("Geçerli bir JSON gövdesi gerekli.", 400)
    }
}

export function requestBodyErrorResponse(error: unknown, headers: Record<string, string>): Response | null {
    if (!(error instanceof RequestBodyError)) return null
    return new Response(JSON.stringify({ error: error.message }), {
        status: error.status,
        headers: { ...headers, "Content-Type": "application/json; charset=utf-8" },
    })
}
