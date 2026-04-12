import fs from 'fs'
import { getUserStats, setUserStats } from '../lib/stats.js'
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'

const handler = async (m, { conn, text, isOwner, isROwner }) => {

  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.owner_quitarlimit

  try {
    const isLidOwner = global.lidOwners?.includes(m.sender) || false
    if (!isOwner && !isROwner && !isLidOwner) throw tradutor.soloOwner

    let rawJid = m.isGroup ? (m.mentionedJid?.[0] || null) : m.chat
    if (!rawJid) throw tradutor.texto1

    let who = rawJid
    if (rawJid.includes('@lid') && m.isGroup) {
      const { participants } = await getGroupDataForPlugin(conn, m.chat, m.sender)
      const found = participants.find(p => p.lid === rawJid)
      if (found?.id) who = found.id
    }

    let senderJid = m.sender
    if (m.sender.includes('@lid') && m.isGroup) {
      const { participants } = await getGroupDataForPlugin(conn, m.chat, m.sender)
      const found = participants.find(p => p.lid === m.sender)
      if (found?.id) senderJid = found.id
    }

    const txt = text ? text.replace('@' + rawJid.split('@')[0], '').trim() : ''
    if (!txt) throw tradutor.texto2
    if (isNaN(txt)) throw tradutor.texto3

    const limitAmount = parseInt(txt)
    if (limitAmount < 1) throw tradutor.texto4

    const userStats = getUserStats(who)
    const limitBefore = userStats.limit
    const newLimit = Math.max(0, limitBefore - limitAmount)
    const actualRemoved = limitBefore - newLimit

    userStats.limit = newLimit
    setUserStats(who, userStats)

    m.reply(
      `${tradutor.titulo}\n` +
      `${tradutor.para} @${who.split('@')[0]}\n` +
      `${tradutor.por} @${senderJid.split('@')[0]}\n\n` +
      `${tradutor.quitados} -${actualRemoved}\n\n` +
      `${tradutor.antes} ${limitBefore}\n` +
      `${tradutor.actual} ${newLimit}\n` +
      (limitBefore < limitAmount ? `${tradutor.insuficiente}\n` : '') +
      `${tradutor.footer}`,
      null,
      { mentions: [who, senderJid] }
    )

  } catch (error) {
    if (typeof error === 'string') m.reply(error)
    else {
      console.error('Error en owner-quitarLimit:', error)
      m.reply(tradutor.error)
    }
  }
}

handler.command = ['quitarlimit', 'removelimit', 'quitarlimite', 'removelimite', 'qlimit']
handler.rowner = true

export default handler