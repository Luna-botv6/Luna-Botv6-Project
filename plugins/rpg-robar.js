import fs from 'fs'
import path from 'path'
import { addExp, removeExp, getExp, getArmorStats, hasArmor, damageArmor, getPlayerState, isCapturedByHunter, trackGain } from '../lib/stats.js'
import { checkHunterTrigger, checkHunterCapture } from '../lib/hunterSystem.js'
import { tieneProteccion } from '../lib/usarprote.js'
import { resolveMention } from '../lib/mentionHelper.js'
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'

const COOLDOWN_FILE = './database/robCooldown.json'
const MAX_ROB = 3000
const ROB_COOLDOWN = 2 * 60 * 1000
const VICTIM_MIN_EXP = 1000
const DAILY_ROB_LIMIT = 3
const FAIL_CHANCE = 0.25
const FAIL_PENALTY_MIN = 500
const FAIL_PENALTY_MAX = 2500

function ensureCooldownFile() {
  if (!fs.existsSync('./database')) fs.mkdirSync('./database')
  if (!fs.existsSync(COOLDOWN_FILE)) fs.writeFileSync(COOLDOWN_FILE, '{}')
}

function loadCooldowns() {
  ensureCooldownFile()
  try { return JSON.parse(fs.readFileSync(COOLDOWN_FILE)) } catch { return {} }
}

function saveCooldowns(data) {
  fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(data, null, 2))
}

function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  const hours = Math.floor((duration / (1000 * 60 * 60)) % 24)
  return `${hours} hora(s) ${minutes} minuto(s) y ${seconds} segundo(s)`
}

const handler = async (m, { conn, args }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es'
  let _t = {}
  try {
    const _lang = idioma || global.defaultLenguaje || 'es'
    _t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${_lang}.json`, 'utf8'))
  } catch {
    try { _t = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8')) } catch {}
  }
  const tradutor = _t.plugins.rpg_robar

  const sender = m.sender

  const _capture = checkHunterCapture(sender)
  if (_capture) return m.reply(_capture.message)

  const _u = getPlayerState(sender)
  if (_u.isCaptured) {
    const _reason = isCapturedByHunter(sender)
      ? '⛓️ Estás capturado por el Cazador. Solo un rescate puede liberarte.\n📣 Usa: *rescate pedir*'
      : '⛓️ Estás capturado. Paga tu multa o pide rescate.\n📣 Usa: *rescate pedir*'
    return m.reply(_reason)
  }

  const target = m.isGroup ? resolveMention(m, args) : m.chat

  if (!target) return m.reply(`❌ ${tradutor.texto1}`)
  if (target === sender) return m.reply(`🤨 ${tradutor.texto2}`)

  if (m.isGroup) {
    const _g = await getGroupDataForPlugin(conn, m.chat, m.sender)
    const _miembros = _g.participants || []
    const _digitos = target.replace(/@[^@]+$/, '').replace(/[^0-9]/g, '')
    const _esMiembro = _miembros.some(p =>
      (p.id || '').replace(/@[^@]+$/, '').replace(/[^0-9]/g, '') === _digitos ||
      (p.lid || '').replace(/@[^@]+$/, '').replace(/[^0-9]/g, '') === _digitos
    )
    if (_miembros.length > 0 && !_esMiembro) {
      return m.reply(`🚫 @${_digitos} no está en este grupo. Solo podés robar exp a alguien que esté presente aquí (mención o respuesta a un mensaje suyo).`)
    }
  }

  const proteccion = tieneProteccion(target)
  if (proteccion.activa) {
    return m.reply(`❌ ${tradutor.texto3} @${target.split('@')[0]} ${tradutor.texto4}`, null, { mentions: [target] })
  }

  const cooldowns = loadCooldowns()
  const _key = `${sender}:${target}`
  const now = Date.now()
  let _rec = cooldowns[_key]
  if (typeof _rec !== 'object' || !_rec) _rec = { t: 0, c: 0, d: 0 }
  if (now - _rec.d >= 24 * 60 * 60 * 1000) {
    _rec.c = 0
    _rec.d = now
  }
  if (now < _rec.t + ROB_COOLDOWN) {
    const timeLeft = msToTime(_rec.t + ROB_COOLDOWN - now)
    return m.reply(`⏳ ${tradutor.texto5} ${timeLeft}`)
  }
  if (_rec.c >= DAILY_ROB_LIMIT) {
    return m.reply(`⏳ Ya le robaste ${DAILY_ROB_LIMIT} veces hoy a @${target.split('@')[0]}. Volvé mañana.`, null, { mentions: [target] })
  }

  const victimExp = getExp(target)
  if (victimExp < VICTIM_MIN_EXP) {
    return m.reply(`😅 @${target.split('@')[0]} tiene menos de *${VICTIM_MIN_EXP} exp*... muy pobre para robarle.`, null, { mentions: [target] })
  }
  let robAmount = Math.min(Math.floor(Math.random() * MAX_ROB), victimExp)

  const armor = getArmorStats(target)
  if (hasArmor(target) && armor && (armor.durability || 0) > 0) {
    const reduction = Math.floor(robAmount * ((armor.defense || 0) / 100))
    robAmount = Math.max(0, robAmount - reduction)
    const dmg = Math.floor(1 + Math.random() * 3)
    const remaining = damageArmor(target, dmg)
    if (remaining === 0) {
      m.reply(`🪓 La armadura de @${target.split('@')[0]} se ha roto durante el intento.`, null, { mentions: [target] })
    }
  }

  if (robAmount <= 0) return m.reply(`😢 @${target.split('@')[0]} ${tradutor.texto6}`, null, { mentions: [target] })

  if (Math.random() < FAIL_CHANCE) {
    const _sExp = getExp(sender)
    const _penalty = Math.min(Math.floor(FAIL_PENALTY_MIN + Math.random() * (FAIL_PENALTY_MAX - FAIL_PENALTY_MIN)), _sExp)
    removeExp(sender, _penalty)
    _rec.t = now
    _rec.c += 1
    cooldowns[_key] = _rec
    saveCooldowns(cooldowns)
    const _huntF = checkHunterTrigger(sender, 8000, 0)
    const _huntMsgF = _huntF ? _huntF.message : ''
    return m.reply(`😅 Fracasaste el robo a @${target.split('@')[0]} y perdiste *${_penalty} exp* en el intento.${_huntMsgF}`, null, { mentions: [target] })
  }

  addExp(sender, robAmount)
  removeExp(target, robAmount)
  _rec.t = now
  _rec.c += 1
  cooldowns[_key] = _rec
  saveCooldowns(cooldowns)

  const msg = victimExp < MAX_ROB
    ? `💸 ${tradutor.texto8} *${robAmount} exp* a un pobre 😢 @${target.split('@')[0]}`
    : `💰 ${tradutor.texto7} *${robAmount} exp* a @${target.split('@')[0]}`

  const _hunt = checkHunterTrigger(sender, 8000, 0)
  const _huntMsg = _hunt ? _hunt.message : ''
  m.reply(msg + _huntMsg, null, { mentions: [target] })
}

handler.help = ['rob']
handler.tags = ['econ']
handler.command = ['rob', 'robar']

export default handler
