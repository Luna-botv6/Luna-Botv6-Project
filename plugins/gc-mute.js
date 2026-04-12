import fs from 'fs'
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'

const NUM_WORDS = {
  'cero':0,'uno':1,'una':1,'dos':2,'tres':3,'cuatro':4,'cinco':5,
  'seis':6,'siete':7,'ocho':8,'nueve':9,'diez':10,'once':11,'doce':12,
  'quince':15,'veinte':20,'treinta':30,'cuarenta':40,'cincuenta':50,'sesenta':60,
}

function getT(idioma) {
  return JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.gc_mute
}

function normalizeText(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[¿¡?!]/g, '').trim()
}

function parseTime(text) {
  let norm = normalizeText(text)
  for (const [w, n] of Object.entries(NUM_WORDS)) {
    norm = norm.replace(new RegExp('\\b' + w + '\\b', 'g'), String(n))
  }
  const horasMatch = norm.match(/(\d+)\s*h(?:ora)?s?/)
  const minsMatch  = norm.match(/(\d+)\s*m(?:in(?:uto)?s?)?/)
  if (horasMatch) return { minutes: parseInt(horasMatch[1]) * 60, unit: 'horas', value: horasMatch[1] }
  if (minsMatch)  return { minutes: parseInt(minsMatch[1]), unit: 'minutos', value: minsMatch[1] }
  const numOnly = norm.match(/(?:por\s+)?(\d+)(?:\s*$)/)
  if (numOnly) return { minutes: null, ambiguous: true, value: numOnly[1] }
  return null
}

function getMutesDB() {
  if (!global.db?.data) return {}
  if (!global.db.data.mutes) global.db.data.mutes = {}
  return global.db.data.mutes
}

function formatDuration(minutes, t) {
  if (!minutes) return t.sin_limite_fmt
  if (minutes < 60) return `${minutes} ${minutes !== 1 ? t.formato_minutos_pl : t.formato_minutos}`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  let str = `${h} ${h !== 1 ? t.formato_horas_pl : t.formato_horas}`
  if (m > 0) str += ` ${t.formato_y} ${m} ${m !== 1 ? t.formato_minutos_pl : t.formato_minutos}`
  return str
}

function scheduleUnmute(muteKey, minutes, conn, chat, user, t) {
  if (!minutes) return
  setTimeout(async () => {
    const db = getMutesDB()
    if (db[muteKey]) {
      delete db[muteKey]
      await conn.sendMessage(chat, {
        text: `🔊 @${user.split('@')[0]} ${t.auto_unmute}`,
        mentions: [user],
      })
    }
  }, minutes * 60 * 1000)
}

export async function muteUser({ conn, chat, user, mutedBy, minutes, participants, t }) {
  const db = getMutesDB()
  const muteKey = `${chat}_${user}`
  const until = minutes ? Date.now() + minutes * 60 * 1000 : null
  const entry = { mutedBy, mutedAt: Date.now(), until }
  db[muteKey] = entry
  const pEntry = (participants || []).find(p => p.id === user)
  if (pEntry?.lid) db[`${chat}_${pEntry.lid}`] = entry
  scheduleUnmute(muteKey, minutes, conn, chat, user, t)
  return { muteKey, until, duration: formatDuration(minutes, t) }
}

export async function unmuteUser({ chat, user, participants }) {
  const db = getMutesDB()
  let removed = false
  const jidKey = `${chat}_${user}`
  if (db[jidKey]) { delete db[jidKey]; removed = true }
  const pEntry = (participants || []).find(p => p.id === user || p.lid === user)
  if (pEntry?.lid) { const lidKey = `${chat}_${pEntry.lid}`; if (db[lidKey]) { delete db[lidKey]; removed = true } }
  if (pEntry?.id)  { const idKey  = `${chat}_${pEntry.id}`;  if (db[idKey])  { delete db[idKey];  removed = true } }
  const userNum = user.replace(/[^0-9]/g, '')
  for (const key of Object.keys(db)) {
    if (key.startsWith(chat + '_') && key.replace(/[^0-9]/g, '').includes(userNum)) {
      delete db[key]; removed = true
    }
  }
  return removed
}

export function isUserMuted(chat, user) {
  const db = getMutesDB()
  const userNum = user.replace(/[^0-9]/g, '')
  for (const key of Object.keys(db)) {
    if (!key.startsWith(chat + '_')) continue
    if (!key.replace(/[^0-9]/g, '').includes(userNum)) continue
    const entry = db[key]
    if (!entry) continue
    if (entry.until && Date.now() > entry.until) { delete db[key]; continue }
    return true
  }
  return false
}

export function getMuteInfo(chat, user) {
  const db = getMutesDB()
  return db[`${chat}_${user}`] || null
}

const handler = async (m, { conn, usedPrefix, isOwner, command }) => {
  try {
    if (!m.isGroup) {
      const tFallback = getT(global.defaultLenguaje)
      return m.reply(tFallback.solo_grupos)
    }

    const { participants, isAdmin, isBotAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender)
    const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje
    const t = getT(idioma)

    if (!isBotAdmin) return m.reply(t.bot_no_admin)
    if (!isAdmin && !isOwner) return m.reply(t.solo_admins)

    const resolveLid = (jid) => {
      if (!jid) return null
      if (!jid.includes('@lid')) return jid
      return participants.find(u => u.lid === jid)?.id || null
    }

    const isMuteCmd   = /^(mute|silenciar)$/i.test(command)
    const isUnmuteCmd = /^(unmute|dessilenciar)$/i.test(command)

    let user = null
    if (m.mentionedJid?.[0]) {
      user = resolveLid(m.mentionedJid[0]) || m.mentionedJid[0]
    } else if (m.quoted?.sender) {
      user = resolveLid(m.quoted.sender) || m.quoted.sender
    } else if (m.text) {
      const num = m.text.replace(/[^0-9]/g, '')
      if (num.length >= 11 && num.length <= 15) user = num + '@s.whatsapp.net'
    }

    if (!user) {
      if (isMuteCmd) return m.reply(t.menu.replace(/{prefix}/g, usedPrefix).replace(/{cmd}/g, command))
      return m.reply(`${t.uso_unmute} ${usedPrefix}${command} @usuario`)
    }

    const exists = participants.find(p => p.id === user)
    if (!exists) return m.reply(t.usuario_no_encontrado)

    const adminTag = `@${m.sender.split('@')[0]}`
    const userTag  = `@${user.split('@')[0]}`

    if (isMuteCmd) {
      if (isUserMuted(m.chat, user)) return m.reply(`*[⚠] ${userTag} ${t.ya_silenciado}`)

      const textSinMenciones = (m.text || '').replace(/@\d+/g, '').trim()
      const timeResult = parseTime(textSinMenciones)

      if (timeResult?.ambiguous) {
        return m.reply(
          `⚠️ ${t.ambiguo.replace('{valor}', timeResult.value)}\n\n` +
          `${t.ambiguo_ejemplo}\n` +
          `• _${usedPrefix}${command} @usuario por ${timeResult.value} minutos_\n` +
          `• _${usedPrefix}${command} @usuario por ${timeResult.value} horas_`
        )
      }

      const { duration } = await muteUser({
        conn, chat: m.chat, user, mutedBy: m.sender,
        minutes: timeResult?.minutes || null,
        participants, t
      })

      const duracionStr = timeResult?.minutes ? duration : t.sin_limite

      await conn.sendMessage(m.chat, {
        text: `${t.mute_titulo}\n\n${t.mute_usuario} ${userTag}\n${t.mute_por} ${adminTag}\n⏳ ${t.mute_duracion} *${duracionStr}*`,
        mentions: [m.sender, user],
      })

    } else if (isUnmuteCmd) {
      const removed = await unmuteUser({ chat: m.chat, user, participants })
      if (!removed) return m.reply(`*[⚠]* ${userTag} ${t.no_silenciado}`)
      await conn.sendMessage(m.chat, {
        text: `${t.unmute_titulo}\n\n${t.mute_usuario} ${userTag}\n${t.mute_por} ${adminTag}\n\n${t.unmute_desc}`,
        mentions: [m.sender, user],
      })
    }

  } catch (e) {
    console.error('[ERROR MUTE]', e)
    const tFallback = getT(global.defaultLenguaje)
    await m.reply(tFallback.error)
  }
}

handler.help = ['mute <@user> [por X minutos/horas]', 'unmute <@user>', 'silenciar <@user>', 'dessilenciar <@user>']
handler.tags = ['group']
handler.command = /^(mute|silenciar|unmute|dessilenciar)$/i
handler.group = true

export default handler