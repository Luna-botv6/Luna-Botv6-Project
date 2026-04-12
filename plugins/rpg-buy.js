import fs from 'fs'
import { getUserStats, setUserStats, addExp } from '../lib/stats.js'

const xpperlimit = 350;

const handler = async (m, {conn, command, args}) => {
  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.rpg_shop

  const userStats = getUserStats(m.sender)

  let count = command.replace(/^buy/i, '');
  count = count ? /all/i.test(count) ? Math.floor(userStats.exp / xpperlimit) : parseInt(count) : args[0] ? parseInt(args[0]) : 1;
  count = Math.max(1, count);

  if (userStats.exp >= xpperlimit * count) {
    addExp(m.sender, -xpperlimit * count)
    const newLimit = (userStats.limit || 10) + count
    setUserStats(m.sender, { limit: newLimit })

    conn.reply(m.chat, `
${tradutor.texto1[0]}
${tradutor.texto1[1]} : + ${count}
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
