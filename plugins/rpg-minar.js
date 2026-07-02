import fs from 'fs'
import { getLastMiningTime, setLastMiningTime, initMiningUser } from '../lib/minar.js'
import { addExp, getPlayerState, isCapturedByHunter } from '../lib/stats.js'
import { checkHunterTrigger, checkHunterCapture } from '../lib/hunterSystem.js'
import { checkMerchantTrigger, checkGambler, checkUndeadTrigger, checkVagrantTrigger } from '../lib/npcSystem.js'

const COOLDOWN = 2 * 60 * 1000

function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  return `${minutes}m ${seconds}s`
}

const handler = async (m, { conn }) => {
  const userId = m.sender
  await initMiningUser(userId)

  const _capture = checkHunterCapture(userId)
  if (_capture) return m.reply(_capture.message)

  const _u = getPlayerState(userId)
  if (_u.isCaptured) {
    const _reason = isCapturedByHunter(userId)
      ? '⛓️ Estás capturado por el Cazador. Solo un rescate puede liberarte.\n📣 Usa: *rescate pedir*'
      : '⛓️ Estás capturado. Paga tu multa o pide rescate.\n📣 Usa: *rescate pedir*'
    return m.reply(_reason)
  }

  const idioma = global.db?.data?.users?.[userId]?.language || global.defaultLenguaje || 'es'
  let _t = {}
  try {
    _t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`, 'utf8'))
  } catch {
    try { _t = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8')) } catch {}
  }
  const t = _t.plugins.rpg_minar

  const lastTime = await getLastMiningTime(userId)
  const now = Date.now()

  if (now - lastTime < COOLDOWN) {
    const remaining = COOLDOWN - (now - lastTime)
    return m.reply(`${t.texto1[0]}
${t.texto1[1]}
${t.texto1[2]} *${msToTime(remaining)}*
${t.texto1[3]}`)
  }

  const expGained = Math.floor(Math.random() * 1901) + 100
  await setLastMiningTime(userId, now)
  addExp(userId, expGained)

  const _hunt     = checkHunterTrigger(userId, expGained, 0)
  const _merchant = checkMerchantTrigger(userId)
  const _gambler  = checkGambler(userId)
  const _undead   = checkUndeadTrigger(userId)

  m.reply(`${t.texto2[0]}
${t.texto2[1]}
${t.texto2[2]} *${expGained}*
${t.texto2[3]}
${t.texto2[4]}
${t.texto2[5]}`)

  const _npcMsgs = [
    _hunt?.message, _merchant?.message, _gambler?.message, _undead?.message, checkVagrantTrigger(userId)?.message
  ].filter(Boolean)

  if (_npcMsgs.length > 0) {
    setTimeout(() => {
      for (const msg of _npcMsgs) {
        conn.sendMessage(m.chat, { text: msg.trim() }, { quoted: m })
      }
    }, 3000)
  }
}

handler.help = ['minar']
handler.tags = ['xp']
handler.command = ['minar', 'mine', 'miming']
handler.fail = null
handler.exp = 0

export default handler
