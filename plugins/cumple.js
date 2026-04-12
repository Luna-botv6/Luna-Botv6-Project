import fs from 'fs'
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'

const DB_PATH = './database/cumples.json'
const GIF_URL = 'https://raw.githubusercontent.com/Luna-botv6/base-archivos/main/InShot_20260315_144951431.mp4'

const MESES = {
  enero:1, ene:1, january:1, jan:1,
  febrero:2, feb:2, february:2,
  marco:3, março:3, mar:3, maezo:3, marso:3, march:3, marzo:3,
  abril:4, abr:4, april:4,
  mayo:5, may:5, maio:5,
  junio:6, jun:6, june:6, junho:6,
  julio:7, jul:7, july:7, julho:7,
  agosto:8, ago:8, august:8,
  septiembre:9, sep:9, sept:9, setiembre:9, september:9, setembro:9,
  octubre:10, oct:10, october:10, outubro:10,
  noviembre:11, nov:11, november:11, novembro:11,
  diciembre:12, dic:12, december:12, dezembro:12,
}

function getT(sender) {
  const idioma = global.db?.data?.users?.[sender]?.language || global.defaultLenguaje || 'es'
  return JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.cumple
}

function loadDB() {
  try {
    if (!fs.existsSync('./database')) fs.mkdirSync('./database', { recursive: true })
    if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, '{}')
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'))
  } catch { return {} }
}

function saveDB(data) {
  try { fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2)) } catch {}
}

function parseDate(text) {
  const norm = text.toLowerCase().replace(/[^a-záéíóúñãàâêôçõü0-9\s]/g, '').trim()
  const match = norm.match(/(\d{1,2})\s+(?:de\s+)?([a-záéíóúñãàâêôçõü]+)/)
  if (!match) return null
  const dia = parseInt(match[1])
  const mes = MESES[match[2]]
  if (!mes || dia < 1 || dia > 31) return null
  return { dia, mes }
}

function resolveJid(target, participants) {
  if (!target.includes('@lid')) return target
  const found = participants.find(p => p.lid === target || p.id === target)
  if (found) {
    if (found.id && !found.id.includes('@lid')) return found.id
    if (found.lid === target && found.id) return found.id
  }
  return target
}

const handler = async (m, { conn, usedPrefix, command, args }) => {
  const jid        = m.chat
  const sender     = m.sender
  const isGroup    = m.isGroup
  const t          = getT(sender)

  const ownerNums = (global.owner || []).map(o => String(Array.isArray(o) ? o[0] : o).replace(/\D/g, ''))
  const lidOwners = (global.lidOwners || []).map(o => String(o).replace(/\D/g, ''))
  const isOwner   = ownerNums.includes(sender.replace(/\D/g, '')) || lidOwners.includes(sender.replace(/\D/g, ''))
  let isAdmin = false
  let participants = []

  if (isGroup) {
    try {
      const groupData = await getGroupDataForPlugin(conn, jid, sender)
      participants = groupData.participants || []
      isAdmin = groupData.isAdmin
    } catch {}
  }

  if (!isOwner && !isAdmin) return m.reply(t.solo_admins)

  const db = loadDB()
  if (!db[jid]) db[jid] = {}

  const cmd = command.toLowerCase()

  if (cmd === 'setcumple' || cmd === 'editcumple') {
    if (!m.mentionedJid?.length) return m.reply(t.help_set)
    const raw = args.join(' ')

    for (const target of m.mentionedJid) {
      const realJid = resolveJid(target, participants)
      const tagNum  = realJid.split('@')[0]
      const textAfter = raw.replace(new RegExp(`@${target.split('@')[0]}\\b`), '').trim()
      const fecha = parseDate(textAfter)

      if (!fecha) {
        await conn.sendMessage(jid, {
          text: t.fecha_invalida.replace('{tag}', tagNum),
          mentions: [realJid]
        }, { quoted: m })
        continue
      }

      db[jid][realJid] = { dia: fecha.dia, mes: fecha.mes, editadoPor: sender, editadoEn: Date.now() }
      saveDB(db)
      await conn.sendMessage(jid, {
        text: t.actualizado.replace('{tag}', tagNum).replace('{dia}', fecha.dia).replace('{mes}', t.meses[fecha.mes]),
        mentions: [realJid]
      }, { quoted: m })
    }
    return
  }

  if (cmd === 'delcumple') {
    if (!m.mentionedJid?.length) return m.reply(t.help_del)
    for (const target of m.mentionedJid) {
      const realJid = resolveJid(target, participants)
      const tagNum  = realJid.split('@')[0]
      if (db[jid][realJid]) {
        delete db[jid][realJid]
        saveDB(db)
        await conn.sendMessage(jid, {
          text: t.eliminado.replace('{tag}', tagNum),
          mentions: [realJid]
        }, { quoted: m })
      } else {
        await conn.sendMessage(jid, {
          text: t.no_registrado.replace('{tag}', tagNum),
          mentions: [realJid]
        }, { quoted: m })
      }
    }
    return
  }

  if (args[0]?.toLowerCase() === 'lista') {
    const entradas = Object.entries(db[jid] || {})
    if (!entradas.length) return m.reply(t.lista_vacia)

    const mentions = entradas.map(([j]) => j)
    let txt = `${t.lista_titulo}\n\n`
    for (const [ujid, data] of entradas.sort((a, b) => a[1].mes - b[1].mes || a[1].dia - b[1].dia)) {
      txt += `🎈 @${ujid.split('@')[0]} — ${data.dia} ${t.de} ${t.meses[data.mes]}\n`
    }
    return conn.sendMessage(jid, { text: txt, mentions }, { quoted: m })
  }

  if (args[0]?.toLowerCase() === 'backup') {
    const backupPath = `./database/cumples_backup_${Date.now()}.json`
    fs.copyFileSync(DB_PATH, backupPath)
    return m.reply(t.backup_ok.replace('{path}', backupPath))
  }

  if (!m.mentionedJid?.length) return m.reply(t.help)

  const raw = args.join(' ')
  const registrados = []
  const errores = []

  for (const target of m.mentionedJid) {
    const realJid  = resolveJid(target, participants)
    const tagNum   = realJid.split('@')[0]
    const tagClean = `@${target.split('@')[0]}`
    const idx      = raw.indexOf(tagClean)
    if (idx === -1) continue

    const afterTag = raw.slice(idx + tagClean.length).trim()
    const nextAt   = afterTag.indexOf('@')
    const fechaTxt = nextAt === -1 ? afterTag : afterTag.slice(0, nextAt).trim()
    const fecha    = parseDate(fechaTxt)

    if (!fecha) { errores.push(tagNum); continue }

    db[jid][realJid] = { dia: fecha.dia, mes: fecha.mes, agregadoPor: sender, agregadoEn: Date.now() }
    registrados.push({ jid: realJid, tagNum, dia: fecha.dia, mes: fecha.mes })
  }

  if (registrados.length > 0) {
    saveDB(db)
    const mentions = registrados.map(r => r.jid)
    let txt = `${t.registrados_titulo}\n\n`
    for (const r of registrados) {
      txt += `👤 @${r.tagNum} — 📅 ${r.dia} ${t.de} ${t.meses[r.mes]}\n`
    }
    await conn.sendMessage(jid, { text: txt, mentions }, { quoted: m })
  }

  for (const tagNum of errores) {
    await conn.sendMessage(jid, {
      text: t.fecha_error.replace('{tag}', tagNum),
      mentions: []
    }, { quoted: m })
  }
}

handler.help    = ['cumple', 'setcumple', 'delcumple']
handler.tags    = ['grupos']
handler.command = /^(cumple(años?)?|setcumple|editcumple|delcumple)$/i
export default handler

const CHECKER_STATE_PATH = './database/cumple_checker.json'

function loadCheckerState() {
  try {
    if (fs.existsSync(CHECKER_STATE_PATH))
      return JSON.parse(fs.readFileSync(CHECKER_STATE_PATH, 'utf8'))
  } catch {}
  return { lastChecked: null }
}

function saveCheckerState(state) {
  try {
    if (!fs.existsSync('./database')) fs.mkdirSync('./database', { recursive: true })
    fs.writeFileSync(CHECKER_STATE_PATH, JSON.stringify(state))
  } catch (e) {
    console.error('[cumple] Error guardando estado:', e.message)
  }
}

let _checkerStarted = false

export function startBirthdayChecker(conn) {
  if (_checkerStarted) return
  _checkerStarted = true

  setInterval(async () => {
    const nowUTC = new Date()
    const nowAR  = new Date(nowUTC.getTime() - 3 * 60 * 60 * 1000)
    const today  = `${nowAR.getDate()}-${nowAR.getMonth() + 1}`
    const h      = nowAR.getHours()

    if (h < 8) return

    const state = loadCheckerState()
    if (state.lastChecked === today) return

    state.lastChecked = today
    saveCheckerState(state)
    const db = loadDB()

    for (const [groupJid, members] of Object.entries(db)) {
      const cumples = Object.entries(members).filter(([, d]) => d.dia === nowAR.getDate() && d.mes === nowAR.getMonth() + 1)
      if (!cumples.length) continue

      try {
        let meta
        try { meta = await conn.groupMetadata(groupJid) } catch { continue }
        const allParticipants = meta.participants.map(p => p.id)
        const birthdayJids    = cumples.map(([j]) => j)

        const idioma = global.db?.data?.chats?.[groupJid]?.language || global.defaultLenguaje || 'es'
        const t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.cumple

        const hidetag = '\u200e'.repeat(850) + allParticipants.map(p => ` @${p.split('@')[0]}`).join('')
        const nombresCumple = birthdayJids.map(j => `@${j.split('@')[0]}`).join(', ')
        const msg = t.cumple_msg.replace('{nombres}', nombresCumple) + '\n' + hidetag

        const gifBuffer = await fetch(GIF_URL).then(r => r.arrayBuffer()).then(b => Buffer.from(b))

        await conn.sendMessage(groupJid, {
          video:       gifBuffer,
          caption:     msg,
          mentions:    [...allParticipants, ...birthdayJids],
          gifPlayback: true
        })

      } catch (e) {
        console.error('cumple-checker error:', e.message)
      }
    }
  }, 60 * 1000)
}