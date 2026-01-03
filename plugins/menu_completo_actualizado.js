import fs from 'fs'
import fetch from 'node-fetch'
import { getUserStats, getRoleByLevel } from '../lib/stats.js'

const handler = async (m, { conn, usedPrefix, isPrems }) => {

  if (usedPrefix == 'a' || usedPrefix == 'A') return

  try {
    const idioma = global.db.data.users[m.sender].language || global.defaultLenguaje
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`))
    const tradutor = _translate.plugins.menu_menu

    const videoPath = './src/assets/images/menu/languages/es/VID-20250527-WA0006.mp4'

    const stats = getUserStats(m.sender)
    const currentRole = getRoleByLevel(stats.level)

    const { money, joincount, exp, level, premiumTime, limit } = stats

    const more = String.fromCharCode(8206)
    const readMore = more.repeat(850)

    const taguser = `@${m.sender.split('@')[0]}`

    const str = `${tradutor.texto1[0]}

${tradutor.texto1[1]} ${taguser}

${tradutor.texto1[2]}

${tradutor.texto1[3]} ${level}
${tradutor.texto1[4]} ${exp}
${tradutor.texto1[5]} ${currentRole}
${tradutor.texto1[6]} ${money}
${tradutor.texto1[7]} ${limit}
${tradutor.texto1[8]} ${joincount}
${tradutor.texto1[9]} ${premiumTime > 0 || isPrems ? '✅' : '❌'}
${readMore}

\`🎭 MENÚS ESPECIALES\`
╭───── • ◆ • ─────────────╮
├🎭 *.menuanimes*
├🌐 *.lang*
├📊 *.menuaudios*
├🎶 *.efectosaudio*
╰───── • ◆ • ─────────────╯

\`ℹ️ INFORMACIÓN DEL BOT\`
╭───── • ◆ • ─────────────╮
├📜 *.terminosycondiciones*
├👨‍👩‍👧 *.grupos*
├📊 *.estado*
├🤖 *.infobot*
├⚡ *.speedtest*
├👑 *.owner*
├💻 *.script*
├✉️ *.reporte <texto>*
├🔗 *.join <link>*
├🛠️ *.fixmsgespera*
╰───── • ◆ • ─────────────╯

\`🎮 JUEGOS Y ENTRETENIMIENTO\`
╭───── • ◆ • ─────────────╮
├🧠 *.mates <nivel>*
├📝 *.fake <txt1> <@tag> <txt2>*
├✂️ *.ppt <papel/tijera/piedra>*
├❤️ *.love <nombre/@tag>*
├❓ *.pregunta <txt>*
├⚔️ *.suitpvp <@tag>*
├🎰 *.slot <apuesta>*
├🧩 *.acertijo*
├🏆 *.top <txt>*
├🌈 *.topgays*
├🎌 *.topotakus*
├💑 *.formarpareja*
├✔️ *.verdad*
├⚠️ *.reto*
├🧭 *.pista*
├🔤 *.sopadeletras*
├🗺️ *.glx*
├🎰 *.ruleta*
├⌨️ *.ahorcado*
├🎮 *.tictactoe*
├⛵ *.batalla*
├👀 *.veoveo*
├🛡️ *.usarprote*
╰───── • ◆ • ─────────────╯

\`⚙️ CONFIGURACIÓN DEL GRUPO\`
╭───── • ◆ • ─────────────╮
├👋 *.enable welcome*
├👋 *.disable welcome*
├🔥 *.enable modohorny*
├🧊 *.disable modohorny*
├🔗 *.enable antilink*
├🔗 *.disable antilink*
├🕵️ *.enable detect*
├🕵️ *.disable detect*
├📊 *.enable audios*
├🔇 *.disable audios*
├🎭 *.enable autosticker*
├🎭 *.disable autosticker*
├👁️ *.enable antiviewonce*
├👁️ *.disable antiviewonce*
├🤬 *.enable antitoxic*
├🤐 *.disable antitoxic*
├🛡️ *.enable modoadmin*
├🛡️ *.disable modoadmin*
├🗑️ *.enable antidelete*
├🗑️ *.disable antidelete*
╰───── • ◆ • ─────────────╯

\`👥 ADMINISTRACIÓN DE GRUPOS\`
╭───── • ◆ • ─────────────╮
├➕ *.add*
├❌ *.kick*
├❌ *.kick2*
├📋 *.listanum*
├📤 *.kicknum*
├🔐 *.grupo <abrir/cerrar>*
├⏱️ *.grouptime*
├📈 *.promote*
├📉 *.demote*
├ℹ️ *.infogroup*
├🔗 *.link*
├♻️ *.resetlink*
├📝 *.setname*
├🖊️ *.setdesc*
├📣 *.invocar*
├👋 *.setwelcome*
├🚶 *.setbye*
├🙈 *.hidetag*
├⚠️ *.warn*
├✅ *.unwarn*
├📄 *.listwarn*
├👻 *.fantasmas*
├🧹 *.destraba*
├🖼️ *.setpp*
╰───── • ◆ • ─────────────╯

\`🎵 DESCARGAS Y MULTIMEDIA\`
╭───── • ◆ • ─────────────╮
├🎵 *.play*
├🎵 *.play2*
├📄 *.playdoc*
├📻 *.playlist*
├🎧 *.ytmp3*
├🎬 *.ytmp4*
├🎶 *.spotify*
├📸 *.instagram*
├🎵 *.tiktok*
├📦 *.mediafire*
├☁️ *.gdrive*
├🐦 *.twitter*
├🖼️ *.wallpaper*
╰───── • ◆ • ─────────────╯

\`🔄 CONVERTIDORES\`
╭───── • ◆ • ─────────────╮
├🎞️ *.togifaud*
├🖼️ *.toimg*
├🎧 *.tomp3*
├🎙️ *.toptt*
├🎬 *.tovideo*
├🌐 *.tourl*
├🗣️ *.tts*
╰───── • ◆ • ─────────────╯

\`🖌️ LOGOS Y EFECTOS\`
╭───── • ◆ • ─────────────╮
├🎨 *.logos*
├🎄 *.logochristmas*
├❤️ *.logocorazon*
├💬 *.ytcomment*
├😈 *.hornycard*
├😍 *.simpcard*
├🚓 *.lolice*
├🌫️ *.blur*
╰───── • ◆ • ─────────────╯

\`💬 FRASES Y TEXTO\`
╭───── • ◆ • ─────────────╮
├💘 *.piropo*
├🧠 *.consejo*
├😂 *.chiste*
├📜 *.historia*
├💬 *.frase*
╰───── • ◆ • ─────────────╯

\`👑 OWNER / SISTEMA\`

╭───── • ◆ • ─────────────╮
├🔧 *> <funcion>*
├⚙️ *=> <funcion>*
├🛠️ *$ <funcion>*
├👑 *.dsowner*
├🏷️ *.setprefix <prefijo>*
├🔄 *.resetprefix*
├🔄 *.resetuser <@tag>*
├🛠️ *.restoreuser <@tag>*
├👨‍💻 *.autoadmin*
├✅ *.darmod <@tag>*
├🗑️ *.quitarmod <@tag>*
├📝 *.grouplist*
├🚪 *.leavegc*
├🔒 *.cajafuerte*
├🚫 *.blocklist*
├🔑 *.addowner <@tag / num>*
├🗑️ *.delowner <@tag / num>*
├🛑 *.block <@tag / num>*
├⛔ *.unblock <@tag / num>*
├🔐 *.enable restrict*
├🚫 *.disable restrict*
├🗣️ *.autoread on*
├👀 *.autoread off*
├🌐 *.enable public*
├🔒 *.disable public*
├📱 *.enable pconly*
├💻 *.disable pconly*
├👥 *.enable gconly*
├🚷 *.disable gconly*
├📞 *.enable anticall*
├🚫 *.disable anticall*
├🛑 *.enable antiprivado*
├❌ *.disable antiprivado*
├🤖 *.enable modejadibot*
├⚡ *.disable modejadibot*
├🎶 *.enable audios_bot*
├🔇 *.disable audios_bot*
├🧯 *.enable antispam*
├🚫 *.disable antispam*
├💌 *.msg <txt>*
├🚷 *.banchat*
├✅ *.unbanchat*
├⛔ *.banuser <@tag>*
├🟢 *.unbanuser <@tag>*
├💎 *.dardiamantes <@tag> <cant>*
├🌟 *.añadirxp <@tag> <cant>*
├📣 *.bc <txt>*
├📲 *.bcchats <txt>*
├💬 *.bcgc <txt>*
├🎧 *.bcgc2 <aud>*
├🎬 *.bcgc2 <vid>*
├🖼️ *.bcgc2 <img>*
├🤖 *.bcbot <txt>*
├🧹 *.cleartpm*
├🔄 *.restart*
├⚡ *.update*
├🚫 *.banlist*
├⏳ *.addprem2 <@tag> <time>*
├🎯 *.addprem3 <@tag> <time>*
├💫 *.addprem4 <@tag> <time>*
├❌ *.delprem <@tag>*
├📋 *.listcmd*
├🖼️ *.setppbot <img>*
├➕ *.addcmd <txt>*
├🗑️ *.delcmd*
├💾 *.saveimage <img>*
├👁️ *.viewimage <txt>*
╰───── • ◆ • ─────────────╯
`.trim()

    const fkontak = {
      key: { participants: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'Halo' },
      message: {
        contactMessage: {
          vcard: `BEGIN:VCARD
VERSION:3.0
N:Luna;Bot;;;
FN:LunaBot
TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}
END:VCARD`
        }
      }
    }

    await conn.sendMessage(m.chat, {
      video: { url: videoPath },
      gifPlayback: true,
      caption: str,
      mentions: [m.sender]
    }, { quoted: fkontak })

  } catch (e) {
    conn.reply(m.chat, tradutor.texto1[29], m)
  }
}

handler.command = /^(menu|menú|memu|memú|help|info|comandos|allmenu|ayuda|cmd)$/i
handler.exp = 50
handler.fail = null
export default handler

function clockString(ms) {
  const h = isNaN(ms) ? '--' : Math.floor(ms / 3600000)
  const m = isNaN(ms) ? '--' : Math.floor(ms / 60000) % 60
  const s = isNaN(ms) ? '--' : Math.floor(ms / 1000) % 60
  return [h, m, s].map(v => v.toString().padStart(2, 0)).join(':')
}
