import { test, expect, describe } from 'bun:test'
import { sendUrl, getUpdatesUrl, parseUpdates } from './telegram-api'

describe('url builders', () => {
  test('sendUrl', () => {
    expect(sendUrl('123:ABC')).toBe('https://api.telegram.org/bot123:ABC/sendMessage')
  })
  test('getUpdatesUrl with/without offset', () => {
    expect(getUpdatesUrl('T', 0)).toBe('https://api.telegram.org/botT/getUpdates?timeout=0')
    expect(getUpdatesUrl('T', 42)).toBe('https://api.telegram.org/botT/getUpdates?offset=42&timeout=0')
  })
})

describe('parseUpdates', () => {
  const upd = (id: number, chat: string, text: string) => ({
    update_id: id,
    message: { chat: { id: chat }, text },
  })

  test('returns only the authorized chat, advances offset past all', () => {
    const json = {
      result: [upd(10, '999', '/runs'), upd(11, '555', '/run docs'), upd(12, '999', '/status')],
    }
    const { messages, nextOffset } = parseUpdates(json, '999')
    expect(messages).toEqual([
      { updateId: 10, text: '/runs' },
      { updateId: 12, text: '/status' },
    ])
    expect(nextOffset).toBe(13) // 12 (max over ALL updates) + 1
  })

  test('numeric chat id matches string chatId', () => {
    const json = { result: [{ update_id: 1, message: { chat: { id: 999 }, text: '/help' } }] }
    expect(parseUpdates(json, '999').messages).toHaveLength(1)
  })

  test('empty chatId → no commands (auth boundary), but offset still advances', () => {
    const json = { result: [upd(5, '999', '/run dangerous')] }
    const { messages, nextOffset } = parseUpdates(json, '')
    expect(messages).toEqual([])
    expect(nextOffset).toBe(6)
  })

  test('edited_message is honored', () => {
    const json = { result: [{ update_id: 7, edited_message: { chat: { id: '999' }, text: '/runs' } }] }
    expect(parseUpdates(json, '999').messages).toEqual([{ updateId: 7, text: '/runs' }])
  })

  test('non-text updates ignored; empty result → offset 0', () => {
    expect(parseUpdates({ result: [{ update_id: 3, message: { chat: { id: '999' } } }] }, '999')).toEqual({
      messages: [],
      nextOffset: 4,
    })
    expect(parseUpdates({ result: [] }, '999')).toEqual({ messages: [], nextOffset: 0 })
    expect(parseUpdates({}, '999')).toEqual({ messages: [], nextOffset: 0 })
  })
})
