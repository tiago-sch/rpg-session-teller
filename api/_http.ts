import type { IncomingMessage, ServerResponse } from 'node:http'

export type ApiRequest = IncomingMessage & {
  body?: unknown
  method?: string
}

export type ApiResponse = ServerResponse & {
  status: (code: number) => ApiResponse
  json: (body: unknown) => void
}

export async function readJsonBody(req: ApiRequest) {
  if (req.body && typeof req.body === 'object') return req.body

  const rawBody = await readRawBody(req)
  if (!rawBody.length) return {}
  return JSON.parse(rawBody.toString('utf8'))
}

export async function readRawBody(req: IncomingMessage) {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

export function sendError(res: ApiResponse, code: number, message: string) {
  return res.status(code).json({ error: message })
}
