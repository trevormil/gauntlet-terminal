// Pure builders for the Telegram Bot HTTP API (no I/O — unit-testable). The
// actual fetch lives in telegram.ts (poll/control) and events.ts (notify).

const API = 'https://api.telegram.org'

export function sendUrl(token: string): string {
  return `${API}/bot${token}/sendMessage`
}

/** Long-poll-free getUpdates; `offset` acks everything below it. */
export function getUpdatesUrl(token: string, offset: number): string {
  const q = offset > 0 ? `?offset=${offset}&timeout=0` : '?timeout=0'
  return `${API}/bot${token}/getUpdates${q}`
}

export type TgMessage = { updateId: number; text: string }
export type ParsedUpdates = { messages: TgMessage[]; nextOffset: number }

/** Extract text messages from the *authorized* chat, plus the ack offset.
 *  `nextOffset` advances past EVERY update (incl. other chats) so we never
 *  re-fetch them; only messages from `chatId` are returned to act on — that
 *  fixed chat is the auth boundary, so an empty chatId yields no commands. */
export function parseUpdates(json: unknown, chatId: string): ParsedUpdates {
  const result = (json as { result?: unknown })?.result
  const messages: TgMessage[] = []
  let maxId = 0
  if (Array.isArray(result)) {
    for (const u of result) {
      const id = Number(u?.update_id) || 0
      if (id > maxId) maxId = id
      const msg = u?.message ?? u?.edited_message
      const text = msg?.text
      const cid = String(msg?.chat?.id ?? '')
      if (typeof text === 'string' && chatId && cid === chatId) messages.push({ updateId: id, text })
    }
  }
  return { messages, nextOffset: maxId ? maxId + 1 : 0 }
}
