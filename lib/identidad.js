import { resolveJidToPhone } from './funcion/lid-resolver.js'
import { getLidMapRaw } from './lidMap.js'

export function digitos(jid) {
  if (!jid) return null
  const limpio = String(jid)
    .replace(/@s\.whatsapp\.net$/i, '')
    .replace(/@c\.us$/i, '')
    .replace(/@lid$/i, '')
    .replace(/@g\.us$/i, '')
    .replace(/@newsletter$/i, '')
    .replace(/\D/g, '')
  return limpio || null
}

export function esLid(jid) {
  return typeof jid === 'string' && /@lid$/i.test(jid)
}

export function telefono(jid, conn) {
  if (!jid) return null
  if (esLid(jid)) {
    try {
      const tel = resolveJidToPhone(jid, conn || global.conn)
      if (tel) return tel
    } catch {}
  }
  return digitos(jid)
}

export function idCanonico(jid, conn) {
  if (!jid) return null
  const tel = telefono(jid, conn)
  const base = tel || digitos(jid)
  if (!base) return String(jid)
  if (String(jid).endsWith('@g.us')) return String(jid)
  if (String(jid).endsWith('@newsletter')) return String(jid)
  return `${base}@s.whatsapp.net`
}

export function idsEquivalentes(a, b, conn) {
  if (!a || !b) return false
  if (String(a) === String(b)) return true
  const da = digitos(a)
  const db = digitos(b)
  if (da && db && da === db) return true
  const ta = telefono(a, conn)
  const tb = telefono(b, conn)
  if (ta && tb && ta === tb) return true
  const map = getLidMapRaw()
  if (da && map) {
    const valor = map.get(da)
    if (valor && (valor === db || valor === tb)) return true
    for (const [lid, tel] of map) {
      if (tel === db || tel === tb) {
        if (lid === da) return true
      }
    }
  }
  return false
}

export function mismoUsuario(a, b, conn) {
  return idsEquivalentes(a, b, conn)
}

export function jidParaEnviar(jid, conn) {
  return idCanonico(jid, conn) || jid
}

function migrarClavesUsuario(rawJid, canonJid) {
  const users = global.db?.data?.users
  if (!users || !rawJid || !canonJid) return
  const pares = [
    [String(rawJid), String(canonJid)],
    [digitos(rawJid), digitos(canonJid)]
  ]
  let cambiado = false
  for (const [viejo, nuevo] of pares) {
    if (!viejo || !nuevo || viejo === nuevo) continue
    if (!users[viejo] || users[nuevo]) continue
    users[nuevo] = users[viejo]
    delete users[viejo]
    cambiado = true
  }
  if (cambiado) global.db?.write?.()
}

export function normalizarMensaje(m, conn) {
  if (!m) return m
  const contextos = [
    m.message?.contextInfo,
    m.message?.extendedTextMessage?.contextInfo,
    m.message?.imageMessage?.contextInfo,
    m.message?.videoMessage?.contextInfo,
    m.msg?.contextInfo
  ]
  for (const ctx of contextos) {
    if (!ctx) continue
    if (Array.isArray(ctx.mentionedJid)) {
      ctx.mentionedJid = ctx.mentionedJid.map((jid) => idCanonico(jid, conn) || jid)
    }
    if (ctx.participant) ctx.participant = idCanonico(ctx.participant, conn) || ctx.participant
  }
  if (m.sender) {
    const canonico = idCanonico(m.sender, conn)
    if (canonico && canonico !== m.sender) {
      if (!m.senderRaw) m.senderRaw = m.sender
      migrarClavesUsuario(m.senderRaw, canonico)
      try {
        Object.defineProperty(m, 'sender', {
          value: canonico,
          enumerable: true,
          configurable: true,
          writable: true
        })
      } catch {}
    }
  }
  return m
}
