import { setConfig, getConfig } from '../lib/funcConfig.js'
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js'
import { setOwnerFunction } from '../lib/owner-funciones.js'
import fs from 'fs'

const configLocks = new Map()

async function safeSetConfig(chatId, config) {
  if (configLocks.has(chatId)) await configLocks.get(chatId)
  const promise = setConfig(chatId, config)
  configLocks.set(chatId, promise)
  try { await promise }
  finally { configLocks.delete(chatId) }
}

const CONFIG_MAP = {
  welcome: { key: 'welcome', group: true, admin: true },
  detect: { key: 'detect', group: true, admin: true },
  detect2: { key: 'detect2', group: true, admin: true },
  antidelete: { key: 'antidelete', group: true, admin: true },
  antilink: { key: 'antiLink', group: true, admin: true },
  antilink2: { key: 'antiLink2', group: true, admin: true },
  modoadmin: { key: 'modoadmin', group: true, admin: true },
  autosticker: { key: 'autosticker', group: true, admin: true },
  audios: { key: 'audios', group: true, admin: true },
  antitoxic: { key: 'antiToxic', group: true, admin: true },
  afk: { key: 'afkAllowed', group: true, admin: true },
  restrict: { key: 'restrict', bot: true, owner: true },
  audios_bot: { key: 'audios_bot', bot: true, owner: true },
  autoread: { key: 'autoread2', bot: true, owner: true },
  anticall: { key: 'antiCall', bot: true, owner: true },
  antispam: { key: 'antispam', bot: true, owner: true },
  antiprivado: { key: 'antiprivado', file: true, owner: true },
  modopublico: { key: 'modopublico', file: true, owner: true },
  vierwimage: { key: 'vierwimage', file: true, owner: true },
  modogrupos: { key: 'modogrupos', file: true, owner: true }
}

async function getOwnerNumbers(conn) {
  const nums = []
  const clean = (n) => n.toString().replace(/[^0-9]/g, '')
  if (global.owner?.length) {
    for (const o of global.owner) {
      const n = clean(Array.isArray(o) ? o[0] : o)
      if (n && !nums.includes(n)) nums.push(n)
    }
  }
  if (global.lidOwners?.length) {
    for (const o of global.lidOwners) {
      const n = clean(o)
      if (n && !nums.includes(n)) nums.push(n)
    }
  }
  return nums
}

const handler = async (m, { conn, usedPrefix, command, args }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje
  const _translate = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`))
  const t = _translate.plugins.config_handler

  if (!conn?.user?.jid) return m.reply(t.sin_sesion)

  const realNum = m.sender.replace(/[^0-9]/g, '')
  const ownerNumbers = await getOwnerNumbers(conn)
  const isROwner = ownerNumbers.includes(realNum)
  const isOwner = isROwner || m.sender === conn?.user?.jid
  const isAdmin = m.isGroup ? (await getGroupDataForPlugin(conn, m.chat, m.sender)).isAdmin : false

  const isEnable = /true|enable|(turn)?on|1/i.test(command)
  const type = (args[0] || '').toLowerCase()

  if (!CONFIG_MAP[type]) {
    if (!/[01]/.test(command)) {
      const h = t.help

      const helpText =
        `${h[0]}\n\n` +
        t.descripcion
          .replace(/{prefix}/g, usedPrefix)
          .replace(/{command}/g, command)
          .replace(/{value}/g, h[1] || '') +
        `\n\n${h[2] || ''}`

      await conn.sendMessage(m.chat, { text: helpText }, { quoted: m })
    }
    return
  }

  const config = CONFIG_MAP[type]

  if (config.group && !m.isGroup) return m.reply(t.solo_grupos)
  if (config.admin && !isAdmin && !isOwner) return m.reply(t.solo_admins)
  if (config.owner && !isOwner && !isROwner) return m.reply(t.solo_owner)

  if (config.file) {
    const saved = setOwnerFunction(type, isEnable)
    if (!saved) return m.reply(t.error_config)
  } else if (config.bot) {
    global.db.data.settings[conn.user.jid][config.key] = isEnable
  } else {
    const chat = getConfig(m.chat) || {}
    chat[config.key] = isEnable
    await safeSetConfig(m.chat, chat)
  }

  const scopeText = config.bot || config.file ? t.alcance[0] : t.alcance[1]

  const msg =
    `${t.resultado[0]}\n\n` +
    `${isEnable ? '✅' : '❌'} • *${t.resultado[1]}* _${type}_\n` +
    `🔘 • *${t.resultado[2]}* _${isEnable ? t.resultado[3] : t.resultado[4]}_\n` +
    `🌐 • *${t.resultado[5]}* _${scopeText}_\n\n` +
    t.resultado[6]

  conn.sendMessage(m.chat, { text: msg }, { quoted: m })
}

handler.command = /^((en|dis)able|(tru|fals)e|(turn)?[01])$/i
export default handler