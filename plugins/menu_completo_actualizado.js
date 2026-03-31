import fs from 'fs'
import fetch from 'node-fetch'
import { getUserStats, getRoleByLevel } from '../lib/stats.js'

const handler = async (m, { conn, usedPrefix, isPrems }) => {

  if (usedPrefix == 'a' || usedPrefix == 'A') return

  try {
    const videoPath = './src/assets/images/menu/languages/es/VID-20250527-WA0006.mp4'

    const stats = getUserStats(m.sender)
    const currentRole = getRoleByLevel(stats.level)

    const { money, joincount, exp, level, premiumTime, limit } = stats

    const more = String.fromCharCode(8206)
    const readMore = more.repeat(850)

    const taguser = `@${m.sender.split('@')[0]}`

    const str = `╭━━━━━━━━━━━━━━━━━━━╮
┃  🌙 *LUNA BOT MENU* 🌙
╰━━━━━━━━━━━━━━━━━━━╯

╭━━━『 👤 TU PERFIL 』━━━╮
┃ 👋 Hola ${taguser}
┃
┃ 📊 Nivel: ${level}
┃ ⭐ Exp: ${exp}
┃ 🎯 Rango: ${currentRole}
┃ 💰 Dinero: ${money}
┃ 🎫 Límite: ${limit}
┃ 📝 Registro: ${joincount}
┃ 💎 Premium: ${premiumTime > 0 || isPrems ? '✅' : '❌'}
╰━━━━━━━━━━━━━━━━━━╯
${readMore}

╭━━━『 ℹ️ INFO DEL BOT 』━━━╮
┃ 📜 ${usedPrefix}terminosycondiciones
┃ 👨‍👩‍👧 ${usedPrefix}grupos <canal oficial>
┃ 📊 ${usedPrefix}estado <información>
┃ 🤖 ${usedPrefix}infobot
┃ ⚡ ${usedPrefix}speedtest <velocidad>
┃ 👑 ${usedPrefix}owner <mi credor>
┃ 💻 ${usedPrefix}script
┃ ✉️ ${usedPrefix}reporte <texto>
┃ 🔗 ${usedPrefix}join <link>
┃ 🛠️ ${usedPrefix}lchat <sincroniza>
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━『 🎮 JUEGOS 』━━━╮
┃ 🧠 ${usedPrefix}mates <nivel>
┃ 📝 ${usedPrefix}fake <txt1> <@tag> <txt2>
┃ ✂️ ${usedPrefix}ppt <papel/tijera/piedra>
┃ ❤️ ${usedPrefix}love <nombre/@tag>
┃ ❓ ${usedPrefix}pregunta <txt>
┃ ⚔️ ${usedPrefix}suitpvp <@tag>
┃ 🎰 ${usedPrefix}slot <apuesta>
┃ 🗑️ ${usedPrefix}delttt
┃ 🧩 ${usedPrefix}acertijo
┃ 🏆 ${usedPrefix}top <txt>
┃ 🌈 ${usedPrefix}topgays
┃ 🎌 ${usedPrefix}topotakus
┃ 👫 ${usedPrefix}formarpareja
┃ ✔️ ${usedPrefix}verdad
┃ ⚠️ ${usedPrefix}reto
┃ 🧭 ${usedPrefix}pista
┃ 🔤 ${usedPrefix}sopadeletras
┃ 🗺️ ${usedPrefix}glx
┃ 🎰 ${usedPrefix}ruleta
┃ ⌨️ ${usedPrefix}ahorcado
┃ 🎮 ${usedPrefix}tictactoe
┃ ⛵ ${usedPrefix}batalla
┃ 👀 ${usedPrefix}veoveo
┃ 🛡️ ${usedPrefix}usarprote
╰━━━━━━━━━━━━━━━━━━━╯

╭━『 ⚙️CONFIG GRUPO』━╮
┃ 👋 ${usedPrefix}enable welcome
┃ 👋 ${usedPrefix}disable welcome
┃ 🔥 ${usedPrefix}enable modohorny
┃ 🧊 ${usedPrefix}disable modohorny
┃ 🔗 ${usedPrefix}enable antilink
┃ 🔗 ${usedPrefix}disable antilink
┃ 🔗 ${usedPrefix}enable antilink2
┃ 🔗 ${usedPrefix}disable antilink2
┃ 🕵️ ${usedPrefix}enable detect
┃ 🕵️ ${usedPrefix}disable detect
┃ 📊 ${usedPrefix}enable audios
┃ 🔇 ${usedPrefix}disable audios
┃ 🎭 ${usedPrefix}enable autosticker
┃ 🎭 ${usedPrefix}disable autosticker
┃ 👁️ ${usedPrefix}enable antiviewonce
┃ 👁️ ${usedPrefix}disable antiviewonce
┃ 🤬 ${usedPrefix}enable antitoxic
┃ 🤐 ${usedPrefix}disable antitoxic
┃ 🔛 ${usedPrefix}enable antitraba
┃ 🔛 ${usedPrefix}disable antitraba
┃ 🌍 ${usedPrefix}enable antiarabes
┃ 🌍 ${usedPrefix}disable antiarabes
┃ 🛡️ ${usedPrefix}enable modoadmin
┃ 🛡️ ${usedPrefix}disable modoadmin
┃ 🗑️ ${usedPrefix}enable antidelete
┃ 🗑️ ${usedPrefix}disable antidelete
╰━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━『 🎵 DESCARGAS 』━━━╮
┃ 🎵 ${usedPrefix}play <txt>
┃ 📻 ${usedPrefix}playlist <txt>
┃ 🎶 ${usedPrefix}spotify <txt>
┃ 📘 ${usedPrefix}facebook <url>
┃ 📸 ${usedPrefix}instagram <url>
┃ 📖 ${usedPrefix}igstory <usr>
┃ 🎵 ${usedPrefix}tiktok <url>
┃ 🖼️ ${usedPrefix}tiktokimg <url>
┃ 👤 ${usedPrefix}pptiktok <usr>
┃ 📦 ${usedPrefix}mediafire <url>
┃ 📌 ${usedPrefix}pinterest <txt>
┃ 🧬 ${usedPrefix}gitclone <url>
┃ ☁️ ${usedPrefix}gdrive <url>
┃ 🐦 ${usedPrefix}twitter <url>
┃ 📞 ${usedPrefix}ringtone <txt>
┃ 👠 ${usedPrefix}stickerpack <url>
┃ 🖼️ ${usedPrefix}wallpaper <txt>
╰━━━━━━━━━━━━━━━━━━━╯

╭━『 👥 ADMIN GRUPOS 』━╮
┃ ➕ ${usedPrefix}add <num>
┃ ❌ ${usedPrefix}kick <@tag>
┃ ❌ ${usedPrefix}kick2 <@tag>
┃ 📋 ${usedPrefix}listanum <txt>
┃ 📤 ${usedPrefix}kicknum <txt>
┃ 🔒 ${usedPrefix}grupo <abrir/cerrar>
┃ ⏱️ ${usedPrefix}grouptime
┃ 📈 ${usedPrefix}promote <@tag>
┃ 📉 ${usedPrefix}demote <@tag>
┃ ℹ️ ${usedPrefix}infogroup
┃ ♻️ ${usedPrefix}resetlink
┃ 🔗 ${usedPrefix}link
┃ 📝 ${usedPrefix}setname <txt>
┃ 🖊️ ${usedPrefix}setdesc <txt>
┃ 📣 ${usedPrefix}invocar <txt>
┃ 👋 ${usedPrefix}setwelcome <txt>
┃ 🚶 ${usedPrefix}setbye <txt>
┃ 🙈 ${usedPrefix}hidetag <txt>
┃ 🎵 ${usedPrefix}hidetag <audio>
┃ 🎥 ${usedPrefix}hidetag <video>
┃ 🖼️ ${usedPrefix}hidetag <img>
┃ ⚠️ ${usedPrefix}warn <@tag>
┃ ✅ ${usedPrefix}unwarn <@tag>
┃ 📄 ${usedPrefix}listwarn
┃ 🔇 ${usedPrefix}mute <@tag>
┃ 🔊 ${usedPrefix}unmute <@tag>
┃ 📋 ${usedPrefix}listamute
┃ ⏰ ${usedPrefix}recordar
┃ 👻 ${usedPrefix}fantasmas
┃ 🧹 ${usedPrefix}destraba
┃ 🖼️ ${usedPrefix}setpp <img>
╰━━━━━━━━━━━━━━━━━━━╯

╭━『 🔄 CONVERTIDORES 』━╮
┃ 🎞️ ${usedPrefix}togifaud <video>
┃ 🖼️ ${usedPrefix}toimg <sticker>
┃ 🎧 ${usedPrefix}tomp3 <video>
┃ 🎧 ${usedPrefix}tomp3 <nota voz>
┃ 🎙️ ${usedPrefix}toptt <video/audio>
┃ 🎬 ${usedPrefix}tovideo <sticker>
┃ 🌐 ${usedPrefix}tourl <video/img/audio>
┃ 🗣️ ${usedPrefix}tts <idioma> <txt>
┃ 🗣️ ${usedPrefix}tts <efecto> <txt>
╰━━━━━━━━━━━━━━━━━━━━━━╯

╭━『 🖌️ LOGOS Y EFECTOS 』━╮
┃ 📋 ${usedPrefix}efectos    · Ver lista de efectos
┃ 🎨 ${usedPrefix}logos <efecto> <txt>
┃ 🎄 ${usedPrefix}logochristmas <txt>
┃ ❤️ ${usedPrefix}logocorazon <txt>
┃ 🪪 ${usedPrefix}licencia <txt>  · Licencia con tu foto
┃ 💬 ${usedPrefix}ytcomment <txt>
┃ 📞 ${usedPrefix}hornycard <@tag>
┃ 💘 ${usedPrefix}simpcard <@tag>
┃ 🚨 ${usedPrefix}lolice <@tag>
┃ 🤪 ${usedPrefix}itssostupid
┃ 🟪 ${usedPrefix}pixelar
┃ 🌫️ ${usedPrefix}blur
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━『 💬 FRASES 』━━━╮
┃ 💘 ${usedPrefix}piropo
┃ 🧠 ${usedPrefix}consejo
┃ 💌 ${usedPrefix}fraseromantica
┃ 📖 ${usedPrefix}historiaromantica
╰━━━━━━━━━━━━━━━━━━╯

╭━━━『 🖼️ IMAGENES 』━━━╮
┃ 🎤 ${usedPrefix}kpop <blackpink/exo>
┃ ⚽ ${usedPrefix}cristianoronaldo
┃ ⚽ ${usedPrefix}messi
┃ 🐱 ${usedPrefix}cat
┃ 🐶 ${usedPrefix}dog
┃ 🤣 ${usedPrefix}meme
┃ 🎶 ${usedPrefix}itzy
┃ 🎀 ${usedPrefix}blackpink
┃ 🎄 ${usedPrefix}navidad
┃ 🏔️ ${usedPrefix}wpmontaña
┃ 🔫 ${usedPrefix}pubg
┃ 🎮 ${usedPrefix}wpgaming
┃ 🌅 ${usedPrefix}wpaesthetic
┃ 🌇 ${usedPrefix}wpaesthetic2
┃ 🎲 ${usedPrefix}wprandom
┃ 📱 ${usedPrefix}wallhp
┃ 🚗 ${usedPrefix}wpvehiculo
┃ 🏍️ ${usedPrefix}wpmoto
┃ ☕ ${usedPrefix}coffee
┃ 😀 ${usedPrefix}pentol
┃ 🎨 ${usedPrefix}caricatura
┃ 🌌 ${usedPrefix}ciberespacio
┃ 🧠 ${usedPrefix}technology
┃ 🐱 ${usedPrefix}doraemon
┃ 👾 ${usedPrefix}hacker
┃ 🪐 ${usedPrefix}planeta
┃ 👤 ${usedPrefix}randomprofile
╰━━━━━━━━━━━━━━━━━━━━━╯

╭━『 🛠️ HERRAMIENTAS 』━╮
┃ 🔍 ${usedPrefix}inspect <wagc_url>
┃ 🎨 ${usedPrefix}dall-e <txt>
┃ 🖼️ ${usedPrefix}tamaño <cant> <img/video>
┃ 👁️ ${usedPrefix}readviewonce <img/video>
┃ 🌤️ ${usedPrefix}clima <país> <ciudad>
┃ 📊 ${usedPrefix}encuesta <txt1|txt2>
┃ ⛔ ${usedPrefix}afk <motivo>
┃ 📄 ${usedPrefix}ocr <img>
┃ 📄 ${usedPrefix}hd <img>
┃ 🔗 ${usedPrefix}acortar <url>
┃ ➗ ${usedPrefix}calc <operacion>
┃ 🗑️ ${usedPrefix}del <msj>
┃ 📸 ${usedPrefix}readqr <img>
┃ 📲 ${usedPrefix}qrcode <txt>
┃ 📖 ${usedPrefix}readmore <txt1|txt2>
┃ 🖋️ ${usedPrefix}styletext <txt>
┃ 🌐 ${usedPrefix}traducir <txt>
┃ 📞 ${usedPrefix}nowa <num>
┃ 🦠 ${usedPrefix}covid <pais>
┃ ⏰ ${usedPrefix}horario
┃ 📩 ${usedPrefix}dropmail
┃ 📱 ${usedPrefix}igstalk <usr>
┃ 🎵 ${usedPrefix}tiktokstalk <usr>
┃ 🖼️ ${usedPrefix}img <txt>
╰━━━━━━━━━━━━━━━━━━━╯

╭━━━『 🎮 RPG 』━━━╮
┃ 🗺️ ${usedPrefix}adventure
┃ 🏹 ${usedPrefix}cazar
┃ 🧰 ${usedPrefix}cofre
┃ 🥸 ${usedPrefix}robard
┃ 💰 ${usedPrefix}balance
┃ 🎁 ${usedPrefix}claim
┃ ❤️ ${usedPrefix}heal
┃ 🏆 ${usedPrefix}lb
┃ ⬆️ ${usedPrefix}levelup
┃ 🧙 ${usedPrefix}myns
┃ 👤 ${usedPrefix}perfil
┃ 💼 ${usedPrefix}work
┃ ⛏️ ${usedPrefix}minar
┃ ⛏️ ${usedPrefix}minar2
┃ 💎 ${usedPrefix}minard
┃ 🌙 ${usedPrefix}minarluna
┃ 💰 ${usedPrefix}juegolimit
┃ 🏎️ ${usedPrefix}carreraautos
┃ 🛒 ${usedPrefix}buy
┃ 💣 ${usedPrefix}buscaminas
┃ ✨ ${usedPrefix}verexp <@tag>
┃ 🛍️ ${usedPrefix}buyall
┃ ✅ ${usedPrefix}verificar
┃ 🕵️ ${usedPrefix}robar <cant> <@tag>
┃ 🚓 ${usedPrefix}crime
┃ 🛒 ${usedPrefix}cambiar
┃ 💸 ${usedPrefix}transfer <tipo> <cant> <@tag>
┃ ❌ ${usedPrefix}unreg <sn>
┃ 🛡️ ${usedPrefix}verprotes
┃ 🎲 ${usedPrefix}rw
┃ 💖 ${usedPrefix}claimw
┃ 💞 ${usedPrefix}harem
┃ 🏆 ${usedPrefix}rewardwaifu
┃ 🗳️ ${usedPrefix}vote <nombreWaifu> <valor>
┃ ⚡ ${usedPrefix}updatewaifus
╰━━━━━━━━━━━━━━━━━━━╯

╭━━━『 🎨 STICKERS 』━━━╮
┃ 😎 ${usedPrefix}sticker <img/video>
┃ 🌐 ${usedPrefix}sticker <url>
┃ 🎥 ${usedPrefix}sticker2 <img/video>
┃ 🌐 ${usedPrefix}sticker2 <url>
┃ 🖼️ ${usedPrefix}s <img/video>
┃ 🔗 ${usedPrefix}s <url>
┃ 🔄 ${usedPrefix}emojimix <emoji1>&<emoji2>
┃ 🔵 ${usedPrefix}scircle <img>
┃ ✂️ ${usedPrefix}sremovebg <img>
┃ 😊 ${usedPrefix}semoji <tipo> <emoji>
┃ 💬 ${usedPrefix}qc <txt>
┃ 🤗 ${usedPrefix}pat <@tag>
┃ 👋 ${usedPrefix}slap <@tag>
┃ 😘 ${usedPrefix}kiss <@tag>
┃ 🎲 ${usedPrefix}dado
┃ 🎁 ${usedPrefix}wm <packname> <autor>
┃ 🎨 ${usedPrefix}stickermarker <efecto> <img>
┃ ✨ ${usedPrefix}stickerfilter <efecto> <img>
┃ 🥳 ${usedPrefix}animoji <emoji>
╰━━━━━━━━━━━━━━━━━━━━━━╯

╭━『 🌈 TEXTO ANIMADO ATTP 』━╮
┃ 📋 ${usedPrefix}attp       · Ver lista de efectos
┃ 🌈 ${usedPrefix}attp <txt>  · Cambia de colores
┃ ✏️ ${usedPrefix}attp2 <txt>
┃ 🔄 ${usedPrefix}attp3 <txt>
╰━━━━━━━━━━━━━━━━━━━━━━╯

╭━『 ✨ TEXTO ANIMADO TTP 』━╮
┃ 🔴 ${usedPrefix}ttp <txt>
┃ 🔒 ${usedPrefix}ttp2 <txt>
┃ 🏀 ${usedPrefix}ttp3 <txt>   · El texto rebota
┃ 🔍 ${usedPrefix}ttp4 <txt>   · Zoom con pulso
┃ 💥 ${usedPrefix}ttp5 <txt>   · Vibra intenso
┃ 🌊 ${usedPrefix}ttp6 <txt>   · Ola de colores
┃ 👻 ${usedPrefix}ttp7 <txt>   · Aparece y desaparece
┃ 🔥 ${usedPrefix}ttp8 <txt>   · Glitch hacker
┃ ✍️ ${usedPrefix}ttp9 <txt>   · Se escribe solo
┃ 💡 ${usedPrefix}ttp10 <txt>  · Neón parpadeante
┃ ⬇️ ${usedPrefix}ttp11 <txt>  · Cae desde arriba
┃ 📈 ${usedPrefix}ttp12 <txt>  · Crece desde la nada
┃ 🎨 ${usedPrefix}ttp13 <txt>  · Cada letra un color
╰━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━『 👑 OWNER 』━━━╮
┃ 🔧 > <funcion>
┃ ⚙️ => <funcion>
┃ 🛠️ $ <funcion>
┃ 👑 ${usedPrefix}dsowner
┃ 🏷️ ${usedPrefix}setprefix <prefijo>
┃ 🔄 ${usedPrefix}resetprefix
┃ 🔄 ${usedPrefix}resetuser <@tag>
┃ 🛠️ ${usedPrefix}restoreuser <@tag>
┃ 👨‍💻 ${usedPrefix}autoadmin
┃ ✅ ${usedPrefix}darmod <@tag>
┃ 🗑️ ${usedPrefix}quitarmod <@tag>
┃ 📋 ${usedPrefix}grouplist
┃ 🚪 ${usedPrefix}leavegc
┃ 🔒 ${usedPrefix}cajafuerte
┃ 🚫 ${usedPrefix}blocklist
┃ 🔑 ${usedPrefix}addowner <@tag/num>
┃ 🗑️ ${usedPrefix}delowner <@tag/num>
┃ 🛑 ${usedPrefix}block <@tag/num>
┃ ⛔ ${usedPrefix}unblock <@tag/num>
┃ 🔒 ${usedPrefix}enable restrict
┃ 🚫 ${usedPrefix}disable restrict
┃ 🗣️ ${usedPrefix}autoread on
┃ 👀 ${usedPrefix}autoread off
┃ 🌐 ${usedPrefix}enable public
┃ 🔒 ${usedPrefix}disable public
┃ 📱 ${usedPrefix}enable pconly
┃ 💻 ${usedPrefix}disable pconly
┃ 👥 ${usedPrefix}enable gconly
┃ 🚷 ${usedPrefix}disable gconly
┃ 📞 ${usedPrefix}enable anticall
┃ 🚫 ${usedPrefix}disable anticall
┃ 🛑 ${usedPrefix}enable antiprivado
┃ ❌ ${usedPrefix}disable antiprivado
┃ 🤖 ${usedPrefix}enable modejadibot
┃ ⚡ ${usedPrefix}disable modejadibot
┃ 🎶 ${usedPrefix}enable audios_bot
┃ 🔇 ${usedPrefix}disable audios_bot
┃ 🧯 ${usedPrefix}enable antispam
┃ 🚫 ${usedPrefix}disable antispam
┃ 💌 ${usedPrefix}msg <txt>
┃ 🚷 ${usedPrefix}banchat
┃ ✅ ${usedPrefix}unbanchat
┃ 🔄 ${usedPrefix}resetuser <@tag>
┃ ⛔ ${usedPrefix}banuser <@tag>
┃ 🟢 ${usedPrefix}unbanuser <@tag>
┃ 💎 ${usedPrefix}dardiamantes <@tag> <cant>
┃ 🌟 ${usedPrefix}añadirxp <@tag> <cant>
┃ 📣 ${usedPrefix}bc <txt>
┃ 📲 ${usedPrefix}bcchats <txt>
┃ 💬 ${usedPrefix}bcgc <txt>
┃ 🎧 ${usedPrefix}bcgc2 <aud>
┃ 🎬 ${usedPrefix}bcgc2 <vid>
┃ 🖼️ ${usedPrefix}bcgc2 <img>
┃ 🤖 ${usedPrefix}bcbot <txt>
┃ 🧹 ${usedPrefix}cleartpm
┃ 🔄 ${usedPrefix}restart
┃ ⚡ ${usedPrefix}update
┃ 🚫 ${usedPrefix}banlist
┃ ⏳ ${usedPrefix}addprem2 <@tag> <time>
┃ 🎯 ${usedPrefix}addprem3 <@tag> <time>
┃ 💫 ${usedPrefix}addprem4 <@tag> <time>
┃ ❌ ${usedPrefix}delprem <@tag>
┃ 📋 ${usedPrefix}listcmd
┃ 🖼️ ${usedPrefix}setppbot <img>
┃ ➕ ${usedPrefix}addcmd <txt>
┃ 🗑️ ${usedPrefix}delcmd
┃ 💾 ${usedPrefix}saveimage <img>
┃ 👁️ ${usedPrefix}viewimage <txt>
╰━━━━━━━━━━━━━━━━━━━━━╯

╭━━━『 🤖 BOT ADMIN 』━━━╮
┃ 🗑️ .borrarchats   · Borra todos los chats
┃ 👥 .listagrupos   · Lista grupos del bot
┃ 🧹 .limpiargrupos · Sale de grupos vacíos
╰━━━━━━━━━━━━━━━━━━━━━╯

╭━━━『 🤖 LUNA IA 』━━━╮
┃ Hablame natural mencionandome
┃ sin necesidad de comandos 💜
┃
┃ 🎮 ${usedPrefix}iamenu · ver todo lo que hago
┃
┃ Ejemplos rapidos:
┃ › @Luna veo veo
┃ › @Luna clima de tu ciudad
┃ › @Luna activa el modoadmin
┃ › @Luna genera una imagen
┃ › @Luna mutea a @usuario
╰━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━╮
┃  🌙 *LUNA BOT* 🌙
┃  Creado con ❤️
╰━━━━━━━━━━━━━━━━━━━╯`.trim()

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

    await conn.sendButton(
      m.chat,
      '🤖 *Luna IA* — Hablame de forma natural mencionándome.\nSin comandos, sin prefijos. Solo hablá 💜',
      'Luna-Botv6-Project 🌙',
      null,
      [
        ['🤖 Ver menú de IA', `${usedPrefix}iamenu`]
      ],
      null,
      null,
      m
    )

  } catch (e) {
    conn.reply(m.chat, '❌ Ocurrió un error al mostrar el menú', m)
  }
}

handler.command = /^(menu|menú|memu|memú|help|info|comandos|allmenu|ayuda|cmd)$/i
handler.exp = 50
handler.fail = null
export default handler
