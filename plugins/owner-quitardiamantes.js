import fs from 'fs'
import { removeMoney, getMoney } from '../lib/stats.js'
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'

const handler = async (m, { conn, text, isOwner, isROwner }) => {

  const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
  const tradutor = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.owner_quitarmoney

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

    const moneyAmount = parseInt(txt)
    if (moneyAmount < 1) throw tradutor.texto4

    const moneyBefore = getMoney(who)
    removeMoney(who, moneyAmount)
    const moneyAfter = getMoney(who)
    const actualRemoved = moneyBefore - moneyAfter

    const fmt = n => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n

    m.reply(
      `${tradutor.titulo}\n` +
      `${tradutor.para} @${who.split('@')[0]}\n` +
      `${tradutor.por} @${senderJid.split('@')[0]}\n\n` +
      `${tradutor.quitados} -${fmt(actualRemoved)}\n\n` +
      `${tradutor.antes} ${fmt(moneyBefore)}\n` +
      `${tradutor.actual} ${fmt(moneyAfter)}\n` +
      (moneyBefore < moneyAmount ? `${tradutor.insuficiente}\n` : '') +
      `${tradutor.footer}`,
      null,
      { mentions: [who, senderJid] }
    )

  } catch (error) {
    if (typeof error === 'string') m.reply(error)
    else {
      console.error('Error en owner-quitarMoney:', error)
      m.reply(tradutor.error)
    }
  }
}

handler.command = ['quitardiamantes', 'removemoney', 'quitarmoney', 'removerd', 'quitard']
handler.rowner = true

export default handler