import { resolveJid } from './lidMap.js'

function parseMentionFromText(text) {
  if (!text) return null
  const match = text.match(/@(\d{5,})/)
  if (!match) return null
  return `${match[1]}@s.whatsapp.net`
}

export function resolveMention(m, args = [], argIndex = 1) {
  const argList = Array.isArray(args)
    ? args
    : (args?.args || (Array.isArray(m?.args) ? m.args : []))

  // 1) mención WA nativa
  const raw = m.mentionedJid?.[0]
    || m.message?.contextInfo?.mentionedJid?.[0]
    || m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
    || m.quoted?.sender
  if (raw) {
    if (raw.includes('@lid')) {
      const resolved = resolveJid(raw.replace('@lid', '').replace(/[^0-9]/g, ''))
      return resolved || raw
    }
    return raw
  }

  // 2) @número en el texto del mensaje
  const text = m.text || m.message?.conversation || m.message?.extendedTextMessage?.text || ''
  const fromText = parseMentionFromText(text)
  if (fromText) return fromText

  // 3) argumento posicional (ej: args[1] o el primer token numérico)
  const argCandidates = [argList?.[argIndex], ...(Array.isArray(argList) ? argList : [])].filter(Boolean)
  for (const candidate of argCandidates) {
    const clean = candidate.replace(/[^0-9]/g, '')
    if (clean.length >= 5) return `${clean}@s.whatsapp.net`
  }

  return null
}