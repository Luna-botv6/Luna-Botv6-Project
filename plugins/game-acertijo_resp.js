import similarity from 'similarity'

const THRESHOLD = 0.72
const TIMEOUT = 60000

const normalize = str => str
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .trim()

const buildCaption = (question, secsLeft, hint) =>
  `╭━━━「 🧩 *ACERTIJO* 」━━━╮\n` +
  `┃\n` +
  `┃ 🤔 *${question}*\n` +
  (hint ? `┃ ${hint}\n` : '') +
  `┃\n` +
  `┃ ⏱ *Tiempo restante* › ${secsLeft}s\n` +
  `┃ 🏆 *Premio* › +500 Exp\n` +
  `┃\n` +
  `┃ 💬 Responde *citando este mensaje*\n` +
  `┃\n` +
  `╰━━━━━━━━━━━━━━━━━━━━━━━╯`

const handler = (m) => m
handler.all = async function (m, { conn }) {
  try {
    if (!m || m.fromMe || !m.text || !m.chat) return

    const id = m.chat
    if (!this.tekateki || !(id in this.tekateki)) return
    if (!m.quoted) return
    if (!m.quoted.text?.includes('╭━━━「 🧩')) return

    const [sentMsg, json, poin, timer, startTime] = this.tekateki[id]
    const respuesta = normalize(json.response)
    const intento = normalize(m.text)
    const secsLeft = Math.max(0, Math.ceil((TIMEOUT - (Date.now() - startTime)) / 1000))

    if (intento === respuesta) {
      global.db.data.users[m.sender].exp += poin
      clearTimeout(timer)
      delete this.tekateki[id]

      const ganador = m.sender
      const msg =
        `╭━━━「 🎉 *¡CORRECTO!* 」━━━╮\n` +
        `┃\n` +
        `┃ ✅ *Respuesta* › ${json.response}\n` +
        `┃ 👤 *Ganador* › @${ganador.split('@')[0]}\n` +
        `┃ 🏆 *Exp ganada* › +${poin}\n` +
        `┃\n` +
        `╰━━━━━━━━━━━━━━━━━━━━━━━╯`

      await conn.sendMessage(id, { text: msg, mentions: [ganador] }, { quoted: sentMsg })
      return
    }

    if (similarity(intento, respuesta) >= THRESHOLD) {
      const newMsg = await conn.sendMessage(id,
        { text: buildCaption(json.question, secsLeft, `🔥 ¡Casi! Empieza por "${json.response[0].toUpperCase()}"`) },
        { quoted: sentMsg }
      )
      this.tekateki[id][0] = newMsg
      return
    }

    const newMsg = await conn.sendMessage(id,
      { text: `❌ *Incorrecto*\n` + buildCaption(json.question, secsLeft) },
      { quoted: sentMsg }
    )
    this.tekateki[id][0] = newMsg
  } catch (e) {
    console.error('[ACERTIJO-RESP] 💥 Error:', e)
  }
}

handler.exp = 0
export default handler