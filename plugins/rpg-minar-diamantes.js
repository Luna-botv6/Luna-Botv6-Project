import { readFileSync } from 'fs'
import { getLastDiamantMiningTime, setLastDiamantMiningTime, initDiamantMiningUser } from '../lib/minardiamantes.js'
import { addMoney, getMoney, getPlayerState, isCapturedByHunter } from '../lib/stats.js'
import { checkHunterTrigger, checkHunterCapture } from '../lib/hunterSystem.js'
import { checkMerchantTrigger, checkGambler, checkUndeadTrigger, checkVagrantTrigger } from '../lib/npcSystem.js'

const COOLDOWN = 2 * 60 * 1000

function msToTime(duration) {
  const seconds = Math.floor((duration / 1000) % 60)
  const minutes = Math.floor((duration / (1000 * 60)) % 60)
  return `${minutes}m ${seconds}s`
}

function calcularDiamantes() {
  const chance = Math.random()
  if (chance < 0.5)  return rand([1, 2, 3, 5])
  if (chance < 0.75) return rand([8, 10, 12, 15])
  if (chance < 0.9)  return rand([20, 25, 30])
  if (chance < 0.98) return rand([50, 75, 100])
  return rand([150, 200, 250])
}

function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

const handler = async (m, { conn }) => {
  const userId = m.sender
  await initDiamantMiningUser(userId)

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
    _t = JSON.parse(readFileSync(`./src/lunaidiomas/${idioma}.json`, 'utf8'))
  } catch {
    try { _t = JSON.parse(readFileSync('./src/lunaidiomas/es.json', 'utf8')) } catch {}
  }
  const t = _t.plugins.rpg_minardiamantes

  const lastTime = getLastDiamantMiningTime(userId)
  const now = Date.now()

  if (lastTime && (now - lastTime < COOLDOWN)) {
    const remaining = COOLDOWN - (now - lastTime)
    return m.reply(`${t.texto1[0]}
${t.texto1[1]}
${t.texto1[2]} *${msToTime(remaining)}*
${t.texto1[3]}`)
  }

  const reward = calcularDiamantes()
  setLastDiamantMiningTime(userId, now)
  addMoney(userId, reward)
  const total = getMoney(userId)

  const _hunt     = checkHunterTrigger(userId, 0, reward)
  const _merchant = checkMerchantTrigger(userId)
  const _gambler  = checkGambler(userId)
  const _undead   = checkUndeadTrigger(userId)

  m.reply(`${t.texto2[0]}
${t.texto2[1]} *${reward} ${t.texto2[5]}*
${t.texto2[2]} *${total} ${t.texto2[5]}*
${t.texto2[3]}
${t.texto2[4]}
${t.texto2[6]}`)

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

handler.help = ['minardiamantes']
handler.tags = ['economia']
handler.command = ['minardiamantes', 'minard', 'diamondmine', 'minar2']

export default handler
