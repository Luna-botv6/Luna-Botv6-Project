import { readFile } from 'fs/promises'
import { getUserStats, getRoleByLevel } from '../lib/stats.js'

async function loadTranslation(idioma) {
  try {
    const data = await readFile(`./src/lunaidiomas/${idioma}.json`, 'utf8')
    return JSON.parse(data)
  } catch {
    return {}
  }
}

const handler = async (m, { conn, usedPrefix, isPrems }) => {
let t = {}

  if (usedPrefix == 'a' || usedPrefix == 'A') return

  try {
    const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje || 'es'
    const _translate = await loadTranslation(idioma)
    t = _translate?.menu || {}

    let videoPath = `./src/assets/images/menu/languages/${idioma}/VID-20250527-WA0006.mp4`

try {
  await readFile(videoPath)
} catch {
  videoPath = `./src/assets/images/menu/languages/es/VID-20250527-WA0006.mp4`
}

    const stats = getUserStats(m.sender)
    const currentRole = getRoleByLevel(stats.level)

    const { money, joincount, exp, level, premiumTime, limit } = stats

    const more = String.fromCharCode(8206)
    const readMore = more.repeat(850)

    const taguser = `@${m.sender.split('@')[0]}`

    const str = `╭━━━━━━━━━━━━━━━━━━━╮
┃  🌙 *LUNA BOT MENU* 🌙
╰━━━━━━━━━━━━━━━━━━━╯

╭━━━『 👤 ${t.perfil_titulo} 』━━━╮
┃ 👋 ${t.hola} ${taguser}
┃
┃ 📊 ${t.nivel}: ${level}
┃ ⭐ ${t.exp}: ${exp}
┃ 🎯 ${t.rango}: ${currentRole}
┃ 💰 ${t.dinero}: ${money}
┃ 🎫 ${t.limite}: ${limit}
┃ 📝 ${t.registro}: ${joincount}
┃ 💎 ${t.premium}: ${premiumTime > 0 || isPrems ? '✅' : '❌'}
╰━━━━━━━━━━━━━━━━━━╯
${readMore}

╭━━━『 ℹ️ ${t.info_titulo} 』━━━╮
┃ 📜 ${usedPrefix}terminosycondiciones
┃ 👨‍👩‍👧 ${usedPrefix}grupos <${t.canal_oficial}>
┃ 📊 ${usedPrefix}estado <${t.informacion}>
┃ 🤖 ${usedPrefix}infobot
┃ ⚡ ${usedPrefix}speedtest <${t.velocidad}>
┃ 👑 ${usedPrefix}owner <${t.mi_creador}>
┃ ✉️ ${usedPrefix}reporte <${t.texto}>
┃ 🔗 ${usedPrefix}join <link>
┃ 🛠️ ${usedPrefix}lchat <${t.sincroniza}>
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━『 🎮 ${t.juegos_titulo} 』━━━╮
┃ 🧠 ${usedPrefix}mates <${t.nivel}>
┃ 💬 ${usedPrefix}tarot <${t.texto}>
┃ 📝 ${usedPrefix}fake <txt1> <@tag> <txt2>
┃ ✂️ ${usedPrefix}ppt <${t.ppt_opciones}>
┃ ❤️ ${usedPrefix}love <${t.nombre_tag}>
┃ ❓ ${usedPrefix}pregunta <${t.texto}>
┃ 🎰 ${usedPrefix}slot <${t.apuesta}>
┃ 🗑️ ${usedPrefix}delttt
┃ 🧩 ${usedPrefix}acertijo
┃ 🏆 ${usedPrefix}quini6
┃ 🏆 ${usedPrefix}top <${t.texto}>
┃ 🌈 ${usedPrefix}topgays
┃ 🎌 ${usedPrefix}topotakus
┃ 👫 ${usedPrefix}formarpareja
┃ ✔️ ${usedPrefix}verdad
┃ ⚠️ ${usedPrefix}reto
┃ 🧭 ${usedPrefix}pista
┃ 🔤 ${usedPrefix}sopadeletras
┃ 🎰 ${usedPrefix}ruleta
┃ ⌨️ ${usedPrefix}ahorcado
┃ 🎮 ${usedPrefix}tictactoe
┃ ⛵ ${usedPrefix}batalla
┃ 👀 ${usedPrefix}veoveo
┃ 🛡️ ${usedPrefix}usarprote
╰━━━━━━━━━━━━━━━━━━━╯

╭━『 ⚙️ ${t.config_titulo} 』━╮
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

╭━━━『 🎵 ${t.descargas_titulo} 』━━━╮
┃ 🎵 ${usedPrefix}play <${t.texto}>
┃ 📻 ${usedPrefix}playlist <${t.texto}>
┃ 🎶 ${usedPrefix}spotify <${t.texto}>
┃ 📘 ${usedPrefix}facebook <url>
┃ 📸 ${usedPrefix}instagram <url>
┃ 📖 ${usedPrefix}igstory <${t.usuario}>
┃ 🎵 ${usedPrefix}tiktok <url>
┃ 🖼️ ${usedPrefix}tiktokimg <url>
┃ 👤 ${usedPrefix}pptiktok <${t.usuario}>
┃ 📦 ${usedPrefix}mediafire <url>
┃ 📌 ${usedPrefix}pinterest <${t.texto}>
┃ 🧬 ${usedPrefix}gitclone <url>
┃ ☁️ ${usedPrefix}gdrive <url>
┃ 🐦 ${usedPrefix}twitter <url>
┃ 📞 ${usedPrefix}ringtone <${t.texto}>
┃ 👠 ${usedPrefix}stickerpack <url>
┃ 🖼️ ${usedPrefix}wallpaper <${t.texto}>
╰━━━━━━━━━━━━━━━━━━━╯

╭━『 👥 ${t.admin_titulo} 』━╮
┃ ➕ ${usedPrefix}add <${t.numero}>
┃ ❌ ${usedPrefix}kick <@tag>
┃ ❌ ${usedPrefix}kick2 <@tag>
┃ 📋 ${usedPrefix}listanum <${t.texto}>
┃ 📤 ${usedPrefix}kicknum <${t.texto}>
┃ 🔒 ${usedPrefix}grupo <${t.abrir_cerrar}>
┃ ⏱️ ${usedPrefix}grouptime
┃ 📈 ${usedPrefix}promote <@tag>
┃ 📉 ${usedPrefix}demote <@tag>
┃ ℹ️ ${usedPrefix}infogroup
┃ ♻️ ${usedPrefix}resetlink
┃ 🔗 ${usedPrefix}link
┃ 📝 ${usedPrefix}setname <${t.texto}>
┃ 🖊️ ${usedPrefix}setdesc <${t.texto}>
┃ 📣 ${usedPrefix}invocar <${t.texto}>
┃ 👋 ${usedPrefix}setwelcome <${t.texto}>
┃ 🚶 ${usedPrefix}setbye <${t.texto}>
┃ 🙈 ${usedPrefix}hidetag <${t.texto}>
┃ 🎵 ${usedPrefix}hidetag <${t.audio}>
┃ 🎥 ${usedPrefix}hidetag <${t.video}>
┃ 🖼️ ${usedPrefix}hidetag <${t.imagen}>
┃ ⚠️ ${usedPrefix}warn <@tag>
┃ ✅ ${usedPrefix}unwarn <@tag>
┃ 📄 ${usedPrefix}listwarn
┃ 🔇 ${usedPrefix}mute <@tag>
┃ 🔊 ${usedPrefix}unmute <@tag>
┃ 📋 ${usedPrefix}listamute
┃ ⏰ ${usedPrefix}recordar
┃ 👻 ${usedPrefix}fantasmas
┃ 🧹 ${usedPrefix}destraba
┃ 🖼️ ${usedPrefix}setpp <${t.imagen}>
╰━━━━━━━━━━━━━━━━━━━╯

╭━『 🔄 ${t.convertidores_titulo} 』━╮
┃ 🎞️ ${usedPrefix}togifaud <${t.video}>
┃ 🖼️ ${usedPrefix}toimg <sticker>
┃ 🎧 ${usedPrefix}tomp3 <${t.video}>
┃ 🎧 ${usedPrefix}tomp3 <${t.nota_voz}>
┃ 🎙️ ${usedPrefix}toptt <${t.video}/${t.audio}>
┃ 🎬 ${usedPrefix}tovideo <sticker>
┃ 🌐 ${usedPrefix}tourl <${t.video}/${t.imagen}/${t.audio}>
┃ 🗣️ ${usedPrefix}tts <${t.idioma}> <${t.texto}>
┃ 🗣️ ${usedPrefix}tts <${t.efecto}> <${t.texto}>
╰━━━━━━━━━━━━━━━━━━━━━━╯

╭━『 🖌️ ${t.logos_titulo} 』━╮
┃ 📋 ${usedPrefix}efectos    · ${t.ver_efectos}
┃ 🎨 ${usedPrefix}logos <${t.efecto}> <${t.texto}>
┃ 🎄 ${usedPrefix}logochristmas <${t.texto}>
┃ ❤️ ${usedPrefix}logocorazon <${t.texto}>
┃ 🪪 ${usedPrefix}licencia <${t.texto}>  · ${t.licencia_desc}
┃ 💬 ${usedPrefix}ytcomment <${t.texto}>
┃ 📞 ${usedPrefix}hornycard <@tag>
┃ 💘 ${usedPrefix}simpcard <@tag>
┃ 🚨 ${usedPrefix}lolice <@tag>
┃ 🤪 ${usedPrefix}itssostupid
┃ 🟪 ${usedPrefix}pixelar
┃ 🌫️ ${usedPrefix}blur
╰━━━━━━━━━━━━━━━━━━━━╯

╭━━━『 💬 ${t.frases_titulo} 』━━━╮
┃ 💘 ${usedPrefix}piropo
┃ 🧠 ${usedPrefix}consejo
┃ 💌 ${usedPrefix}fraseromantica
┃ 📖 ${usedPrefix}historiaromantica
╰━━━━━━━━━━━━━━━━━━╯

╭━━━『 🖼️ ${t.imagenes_titulo} 』━━━╮
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

╭━『 🛠️ ${t.herramientas_titulo} 』━╮
┃ 🔍 ${usedPrefix}inspect <wagc_url>
┃ 🎨 ${usedPrefix}dall-e <${t.texto}>
┃ 🖼️ ${usedPrefix}tamaño <${t.cantidad}> <${t.imagen}/${t.video}>
┃ 👁️ ${usedPrefix}readviewonce <${t.imagen}/${t.video}>
┃ 🌤️ ${usedPrefix}clima <${t.pais}> <${t.ciudad}>
┃ 📊 ${usedPrefix}encuesta <txt1|txt2>
┃ ⛔ ${usedPrefix}afk <${t.motivo}>
┃ 📄 ${usedPrefix}ocr <${t.imagen}>
┃ 📄 ${usedPrefix}hd <${t.imagen}>
┃ 🔗 ${usedPrefix}acortar <url>
┃ ➗ ${usedPrefix}calc <${t.operacion}>
┃ 🗑️ ${usedPrefix}del <${t.mensaje}>
┃ 📸 ${usedPrefix}readqr <${t.imagen}>
┃ 📲 ${usedPrefix}qrcode <${t.texto}>
┃ 📖 ${usedPrefix}readmore <txt1|txt2>
┃ 🖋️ ${usedPrefix}styletext <${t.texto}>
┃ 🌐 ${usedPrefix}traducir <${t.texto}>
┃ 📞 ${usedPrefix}nowa <${t.numero}>
┃ 🦠 ${usedPrefix}covid <${t.pais}>
┃ ⏰ ${usedPrefix}horario
┃ 📩 ${usedPrefix}dropmail
┃ 📱 ${usedPrefix}igstalk <${t.usuario}>
┃ 🎵 ${usedPrefix}tiktokstalk <${t.usuario}>
┃ 🖼️ ${usedPrefix}img <${t.texto}>
╰━━━━━━━━━━━━━━━━━━━╯

╭━━━『 🎮 ${t.rpg_titulo} 』━━━╮
┃ 🗺️ ${usedPrefix}adventure
┃ 🏹 ${usedPrefix}cazar
┃ 🧰 ${usedPrefix}cofre
┃ 🥸 ${usedPrefix}robard
┃ 💰 ${usedPrefix}balance
┃ 🎁 ${usedPrefix}claim
┃ ❤️ ${usedPrefix}heal
┃ 🏆 ${usedPrefix}lb
┃ ⬆️ ${usedPrefix}levelup
┃ 🧙 ${usedPrefix}mysticmine
┃ 👤 ${usedPrefix}perfil
┃ 💼 ${usedPrefix}work
┃ ⛏️ ${usedPrefix}minar
┃ 💎 ${usedPrefix}minard
┃ 🌙 ${usedPrefix}minarluna
┃ 💰 ${usedPrefix}juegolimit
┃ 🏎️ ${usedPrefix}carreraautos
┃ 🛒 ${usedPrefix}buy
┃ 💣 ${usedPrefix}buscaminas
┃ ✨ ${usedPrefix}verexp <@tag>
┃ 🛍️ ${usedPrefix}buyall
┃ ✅ ${usedPrefix}verificar
┃ 🕵️ ${usedPrefix}robar <${t.cantidad}> <@tag>
┃ 🚓 ${usedPrefix}crime
┃ 🛒 ${usedPrefix}cambiar
┃ 💸 ${usedPrefix}transfer <${t.tipo}> <${t.cantidad}> <@tag>
┃ ❌ ${usedPrefix}unreg <sn>
┃ 🛡️ ${usedPrefix}verprotes
┃ 🎲 ${usedPrefix}rw
┃ 💖 ${usedPrefix}claimw
┃ 💞 ${usedPrefix}harem
┃ 🏆 ${usedPrefix}rewardwaifu
┃ 🗳️ ${usedPrefix}vote <nombreWaifu> <${t.valor}>
┃ ⚡ ${usedPrefix}updatewaifus
╰━━━━━━━━━━━━━━━━━━━╯

╭━━━『 🎨 ${t.stickers_titulo} 』━━━╮
┃ 😎 ${usedPrefix}sticker <${t.imagen}/${t.video}>
┃ 🌐 ${usedPrefix}sticker <url>
┃ 🎥 ${usedPrefix}sticker2 <${t.imagen}/${t.video}>
┃ 🌐 ${usedPrefix}sticker2 <url>
┃ 🖼️ ${usedPrefix}s <${t.imagen}/${t.video}>
┃ 🔗 ${usedPrefix}s <url>
┃ 🔄 ${usedPrefix}emojimix <emoji1>&<emoji2>
┃ 🔵 ${usedPrefix}scircle <${t.imagen}>
┃ ✂️ ${usedPrefix}sremovebg <${t.imagen}>
┃ 😊 ${usedPrefix}semoji <${t.tipo}> <emoji>
┃ 💬 ${usedPrefix}qc <${t.texto}>
┃ 🤗 ${usedPrefix}pat <@tag>
┃ 👋 ${usedPrefix}slap <@tag>
┃ 😘 ${usedPrefix}kiss <@tag>
┃ 🎲 ${usedPrefix}dado
┃ 🎁 ${usedPrefix}wm <packname> <${t.autor}>
┃ 🎨 ${usedPrefix}stickermarker <${t.efecto}> <${t.imagen}>
┃ ✨ ${usedPrefix}stickerfilter <${t.efecto}> <${t.imagen}>
┃ 🥳 ${usedPrefix}animoji <emoji>
╰━━━━━━━━━━━━━━━━━━━━━━╯

╭━『 🌈 ${t.attp_titulo} 』━╮
┃ 📋 ${usedPrefix}attp       · ${t.ver_efectos}
┃ 🌈 ${usedPrefix}attp <${t.texto}>  · ${t.attp_colores}
┃ ✏️ ${usedPrefix}attp2 <${t.texto}>
┃ 🔄 ${usedPrefix}attp3 <${t.texto}>
╰━━━━━━━━━━━━━━━━━━━━━━╯

╭━『 ✨ ${t.ttp_titulo} 』━╮
┃ 🔴 ${usedPrefix}ttp <${t.texto}>
┃ 🔒 ${usedPrefix}ttp2 <${t.texto}>
┃ 🏀 ${usedPrefix}ttp3 <${t.texto}>   · ${t.ttp3}
┃ 🔍 ${usedPrefix}ttp4 <${t.texto}>   · ${t.ttp4}
┃ 💥 ${usedPrefix}ttp5 <${t.texto}>   · ${t.ttp5}
┃ 🌊 ${usedPrefix}ttp6 <${t.texto}>   · ${t.ttp6}
┃ 👻 ${usedPrefix}ttp7 <${t.texto}>   · ${t.ttp7}
┃ 🔥 ${usedPrefix}ttp8 <${t.texto}>   · ${t.ttp8}
┃ ✍️ ${usedPrefix}ttp9 <${t.texto}>   · ${t.ttp9}
┃ 💡 ${usedPrefix}ttp10 <${t.texto}>  · ${t.ttp10}
┃ ⬇️ ${usedPrefix}ttp11 <${t.texto}>  · ${t.ttp11}
┃ 📈 ${usedPrefix}ttp12 <${t.texto}>  · ${t.ttp12}
┃ 🎨 ${usedPrefix}ttp13 <${t.texto}>  · ${t.ttp13}
╰━━━━━━━━━━━━━━━━━━━━━━╯

╭━━━『 👑 ${t.owner_titulo} 』━━━╮
┃ 👑 ${usedPrefix}dsowner
┃ 🏷️ ${usedPrefix}setprefix <${t.prefijo}>
┃ 🔄 ${usedPrefix}resetprefix
┃ 🔄 ${usedPrefix}resetuser <@tag>
┃ 🛠️ ${usedPrefix}restoreuser <@tag>
┃ 👨‍💻 ${usedPrefix}autoadmin
┃ 📋 ${usedPrefix}grouplist
┃ 🚪 ${usedPrefix}leavegc
┃ 🚫 ${usedPrefix}blocklist
┃ 🔑 ${usedPrefix}addowner <@tag/${t.numero}>
┃ 🔑 ${usedPrefix}agregarlid <@tag/${t.numero}>
┃ 🗑️ ${usedPrefix}delowner <@tag/${t.numero}>
┃ 🗑️ ${usedPrefix}dellid <@tag/${t.numero}>
┃ 🛑 ${usedPrefix}block <@tag/${t.numero}>
┃ ⛔ ${usedPrefix}unblock <@tag/${t.numero}>
┃ 🔒 ${usedPrefix}enable restrict
┃ 🚫 ${usedPrefix}disable restrict
┃ 🗣️ ${usedPrefix}autoread on
┃ 👀 ${usedPrefix}autoread off
┃ 🌐 ${usedPrefix}enable public
┃ ✅ ${usedPrefix}enaable anticall
┃ 🚫 ${usedPrefix}disable anticall
┃ 🛑 ${usedPrefix}enable antiprivado
┃ ❌ ${usedPrefix}disable antiprivado
┃ 🧯 ${usedPrefix}enable antispam
┃ 🚫 ${usedPrefix}disable antispam
┃ 💌 ${usedPrefix}msg <${t.texto}>
┃ 🚷 ${usedPrefix}banchat✅
┃ ✅ ${usedPrefix}unbanchat
┃ 🔄 ${usedPrefix}resetuser <@tag>
┃ ⛔ ${usedPrefix}banuser <@tag>
┃ 🟢 ${usedPrefix}unbanuser <@tag>
┃ 📌 ${usedPrefix}banid
┃ 🔕 ${usedPrefix}banid <id>
┃ ✅ ${usedPrefix}unbanid <id>
┃ 💎 ${usedPrefix}dardiamantes <@tag> <${t.cantidad}>
┃ 🌟 ${usedPrefix}añadirxp <@tag> <${t.cantidad}>
┃ 📣 ${usedPrefix}bc <${t.texto}>
┃ 📲 ${usedPrefix}bcchats <${t.texto}>
┃ 💬 ${usedPrefix}bcgc <${t.texto}>
┃ 💬 ${usedPrefix}informaragrupos <${t.texto}>
┃ 🎧 ${usedPrefix}bcgc2 <${t.audio}>
┃ 🎬 ${usedPrefix}bcgc2 <${t.video}>
┃ 🖼️ ${usedPrefix}bcgc2 <${t.imagen}>
┃ 🤖 ${usedPrefix}bcbot <${t.texto}>
┃ 🧹 ${usedPrefix}cleartpm
┃ 🔄 ${usedPrefix}restart
┃ ⚡ ${usedPrefix}update
┃ 🚫 ${usedPrefix}banlist
┃ 📋 ${usedPrefix}listcmd
┃ 🖼️ ${usedPrefix}setppbot <${t.imagen}>
┃ ➕ ${usedPrefix}addcmd <${t.texto}>
┃ 🗑️ ${usedPrefix}delcmd
┃ 💾 ${usedPrefix}saveimage <${t.imagen}>
╰━━━━━━━━━━━━━━━━━━━━━╯

╭━━━『 🤖 ${t.botadmin_titulo} 』━━━╮
┃ 🗑️ .borrarchats   · ${t.borrar_chats}
┃ 👥 .listagrupos   · ${t.lista_grupos}
┃ 🧹 .limpiargrupos · ${t.limpiar_grupos}
╰━━━━━━━━━━━━━━━━━━━━━╯

╭━━━『 🤖 ${t.ia_titulo} 』━━━╮
┃ ${t.ia_desc1}
┃ ${t.ia_desc2}
┃
┃ 🎮 ${usedPrefix}iamenu · ${t.ia_ver}
┃
┃ ${t.ia_ejemplos}:
┃ › @Luna veo veo
┃ › @Luna ${t.ia_ejemplo1}
┃ › @Luna ${t.ia_ejemplo2}
┃ › @Luna ${t.ia_ejemplo3}
┃ › @Luna ${t.ia_ejemplo4}
╰━━━━━━━━━━━━━━━━━━━╯

╭━━━━━━━━━━━━━━━━━━━╮
┃  🌙 *LUNA BOT* 🌙
┃  ${t.creado}
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
      t.ia_boton,
      'Luna-Botv6-Project 🌙',
      null,
      [
        [`🤖 ${t.ia_boton_ver}`, `${usedPrefix}iamenu`]
      ],
      null,
      null,
      m
    )

  } catch (e) {
    conn.reply(m.chat, t.error_menu || '❌ Error al mostrar el menú', m)
  }
}

handler.command = /^(menu|menú|memu|memú|help|info|comandos|allmenu|ayuda|cmd)$/i
handler.exp = 50
handler.fail = null
export default handler
