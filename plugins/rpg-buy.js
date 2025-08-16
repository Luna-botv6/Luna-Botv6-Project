import fs from 'fs'
import { getUserStats, setUserStats, addExp } from '../lib/stats.js' // ajusta la ruta

const xpperlimit = 350;

const handler = async (m, {conn, command, args}) => {
  const datas = global
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
  const tradutor = _translate.plugins.rpg_shop

  const userStats = getUserStats(m.sender)

  let count = command.replace(/^buy/i, '');
  count = count ? /all/i.test(count) ? Math.floor(userStats.exp / xpperlimit) : parseInt(count) : args[0] ? parseInt(args[0]) : 1;
  count = Math.max(1, count);

  if (userStats.exp >= xpperlimit * count) {
    // Reducir exp
    addExp(m.sender, -xpperlimit * count)

    // Aumentar limit (lo hacemos manual porque no tienes funci�n para esto)
    const newLimit = (userStats.limit || 10) + count
    setUserStats(m.sender, { limit: newLimit })

    conn.reply(m.chat, `
${tradutor.texto1[0]}
${tradutor.texto1[1]} : + ${count}
${tradutor.texto1[2]} -${xpperlimit * count} XP
${tradutor.texto1[3]}`, m)
  } else {
    conn.reply(m.chat, `${tradutor.texto2} *${count}* ${tradutor.texto3}`, m)
  }
}

handler.help = ['buy', 'buyall']
handler.tags = ['xp']
handler.command = ['buy', 'buyall']

handler.disabled = false

export default handler
