import fs from 'fs'
import path from 'path'
import { addMoney, removeMoney, getMoney, getArmorStats, hasArmor, damageArmor, getPlayerState, isCapturedByHunter } from '../lib/stats.js'
import { checkHunterTrigger, checkHunterCapture } from '../lib/hunterSystem.js'
import { tieneProteccion } from '../lib/usarprote.js'
import { resolveMention } from '../lib/mentionHelper.js'
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'

const cooldownPath = './database/robCooldownMoney.json'
const cooldownTime = 2 * 60 * 1000
const maxRob = 3000
const victimMinMoney = 1000
const dailyRobLimit = 3
const failChance = 0.25
const failPenaltyMin = 500
const failPenaltyMax = 2500

function ensureCooldownDB() {
  if (!fs.existsSync('./database')) fs.mkdirSync('./database')
  if (!fs.existsSync(cooldownPath)) fs.writeFileSync(cooldownPath, '{}')
}

function getCooldowns() {
  ensureCooldownDB()
  return JSON.parse(fs.readFileSync(cooldownPath))
}

function setCooldowns(data) {
  fs.writeFileSync(cooldownPath, JSON.stringify(data, null, 2))
}

function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  return `${hours} Hora(s) ${minutes} Minuto(s)`
}

const handler = async (m, { conn, command, args }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es'
  let _t = {}
  try {
    const _lang = idioma || global.defaultLenguaje || 'es'
    _t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${_lang}.json`, 'utf8'))
  } catch {
    try { _t = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8')) } catch {}
  }
  const tradutor = _t.plugins.rpg_robardiamantes

  const userId = m.sender

  const _capture = checkHunterCapture(userId)
  if (_capture) return m.reply(_capture.message)

  const _u = getPlayerState(userId)
  if (_u.isCaptured) {
    const _reason = isCapturedByHunter(userId)
      ? '⛓️ Estás capturado por el Cazador. Solo un rescate puede liberarte.\n📣 Usa: *rescate pedir*'
      : '⛓️ Estás capturado. Paga tu multa o pide rescate.\n📣 Usa: *rescate pedir*'
    return m.reply(_reason)
  }

  const who = m.isGroup ? resolveMention(m, args) : m.chat
  if (!who) return m.reply(`💎 ${tradutor.texto3}`)
  if (who === userId) return m.reply(`🤨 No podés robarte a vos mismo.`)

  if (m.isGroup) {
    const _g = await getGroupDataForPlugin(conn, m.chat, m.sender)
    const _miembros = _g.participants || []
    const _digitos = who.replace(/@[^@]+$/, '').replace(/[^0-9]/g, '')
    const _esMiembro = _miembros.some(p =>
      (p.id || '').replace(/@[^@]+$/, '').replace(/[^0-9]/g, '') === _digitos ||
      (p.lid || '').replace(/@[^@]+$/, '').replace(/[^0-9]/g, '') === _digitos
    )
    if (_miembros.length > 0 && !_esMiembro) {
      return m.reply(`🚫 @${_digitos} no está en este grupo. Solo podés robar diamantes a alguien que esté presente aquí (mención o respuesta a un mensaje suyo).`)
    }
  }

  const cooldowns = getCooldowns()
  const _key = `${userId}:${who}`
  const now = Date.now()
  let _rec = cooldowns[_key]
  if (typeof _rec !== 'object' || !_rec) _rec = { t: 0, c: 0, d: 0 }
  if (now - _rec.d >= 24 * 60 * 60 * 1000) {
    _rec.c = 0
    _rec.d = now
  }
  if (now < _rec.t + cooldownTime) {
    const timeLeft = msToTime(_rec.t + cooldownTime - now)
    return m.reply(`⏳ ${tradutor.texto1} ${timeLeft} ${tradutor.texto2}`)
  }
  if (_rec.c >= dailyRobLimit) {
    return m.reply(`⏳ Ya le robaste ${dailyRobLimit} veces hoy a @${who.split('@')[0]}. Volvé mañana.`, null, { mentions: [who] })
  }

  const proteccion = tieneProteccion(who)
  if (proteccion.activa) {
    return m.reply(`🛡️ @${who.split('@')[0]} ${tradutor.texto4}`, null, { mentions: [who] })
  }

  const targetDiamonds = getMoney(who)
  if (targetDiamonds < victimMinMoney) {
    return m.reply(`😅 @${who.split('@')[0]} tiene menos de *${victimMinMoney} 💎*... muy pobre para robarle.`, null, { mentions: [who] })
  }
  let toRob = Math.floor(Math.random() * maxRob)

  const armor = getArmorStats(who)
  if (hasArmor(who) && armor && (armor.durability || 0) > 0) {
    const reduction = Math.floor(toRob * ((armor.defense || 0) / 100))
    toRob = Math.max(0, toRob - reduction)
    const dmg = Math.floor(1 + Math.random() * 3)
    const remaining = damageArmor(who, dmg)
    if (remaining === 0) {
      m.reply(`🪓 La armadura de @${who.split('@')[0]} se ha roto durante el intento.`, null, { mentions: [who] })
    }
  }

  if (Math.random() < failChance) {
    const _sMoney = getMoney(userId)
    const _penalty = Math.min(Math.floor(failPenaltyMin + Math.random() * (failPenaltyMax - failPenaltyMin)), _sMoney)
    removeMoney(userId, _penalty)
    _rec.t = now
    _rec.c += 1
    cooldowns[_key] = _rec
    setCooldowns(cooldowns)
    const _huntF = checkHunterTrigger(userId, 0, _penalty + 5000)
    const _huntMsgF = _huntF ? _huntF.message : ''
    return m.reply(`😅 Fracasaste el robo a @${who.split('@')[0]} y perdiste *${_penalty} 💎* en el intento.${_huntMsgF}`, null, { mentions: [who] })
  }

  if (targetDiamonds < toRob) {
    if (targetDiamonds === 0) return m.reply(`❌ ${tradutor.texto5}`)
    await addMoney(userId, targetDiamonds)
    await removeMoney(who, targetDiamonds)
    _rec.t = now
    _rec.c += 1
    cooldowns[_key] = _rec
    setCooldowns(cooldowns)
    const _huntP = checkHunterTrigger(userId, 0, targetDiamonds + 5000)
    const _huntMsgP = _huntP ? _huntP.message : ''
    return m.reply(`💸 ${tradutor.texto6} ${targetDiamonds} ${tradutor.texto7}${_huntMsgP}`)
  }

  await addMoney(userId, toRob)
  await removeMoney(who, toRob)
  _rec.t = now
  _rec.c += 1
  cooldowns[_key] = _rec
  setCooldowns(cooldowns)

  const _hunt = checkHunterTrigger(userId, 0, toRob + 5000)
  const _huntMsg = _hunt ? _hunt.message : ''
  m.reply(`💰 ${tradutor.texto8} ${toRob} ${tradutor.texto9} @${who.split('@')[0]}${_huntMsg}`, null, { mentions: [who] })
}

handler.help = ['robardiamantes']
handler.tags = ['econ']
handler.command = ['robardiamantes', 'robard']

export default handler
