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

  const raw = m.mentionedJid?.[0]
    || m.message?.contextInfo?.mentionedJid?.[0]
    || m.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0]
  if (raw) {
    if (raw.includes('@lid')) {
      return resolveJid(raw.replace('@lid', '').replace(/[^0-9]/g, '')) || null
    }
    return raw
  }

  const text = m.text || m.message?.conversation || m.message?.extendedTextMessage?.text || ''
  const fromText = parseMentionFromText(text)
  if (fromText) return fromText

  const argCandidates = [argList?.[argIndex], ...(Array.isArray(argList) ? argList : [])].filter(Boolean)
  for (const candidate of argCandidates) {
    const clean = String(candidate).replace(/[^0-9]/g, '')
    if (clean.length >= 5) return `${clean}@s.whatsapp.net`
  }

  const quoted = m.quoted?.sender
  if (quoted) {
    if (quoted.includes('@lid')) {
      return resolveJid(quoted.replace('@lid', '').replace(/[^0-9]/g, '')) || quoted
    }
    return quoted
  }

  return null
}