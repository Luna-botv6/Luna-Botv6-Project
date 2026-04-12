import fs from 'fs'
import { getUserStats, getRoleByLevel } from '../lib/stats.js'

const handler = async (m, { conn, usedPrefix, isPrems }) => {
  try {
    const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje || 'es'
    const t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`)).plugins.iamenu

    const stats = getUserStats(m.sender)
    const role = getRoleByLevel(stats.level)

    const { money, exp, level, limit, premiumTime } = stats
    const taguser = `@${m.sender.split('@')[0]}`
    const isPrem = premiumTime > 0 || isPrems
    const botJid = conn.user?.jid || conn.user?.id || ''
    const botTag = `@${botJid.split('@')[0]}`
    const readMore = String.fromCharCode(8206).repeat(850)

    const str = `
${t.titulo}

👤 *${t.perfil}* ${taguser}
📊 ${t.nivel}: ${level}
⭐ Exp: ${exp}
🎯 ${t.rango}: ${role}
💰 ${money} | 🎫 ${t.limite}: ${limit}
💎 ${t.premium}: ${isPrem ? t.premium_si : t.premium_no}

${readMore}

${t.como_usar_titulo}
${t.como_usar_desc}

> ${botTag} ${t.como_usar_ejemplo}

${t.como_usar_extra}

${t.buscar_titulo}

> ${botTag} ${t.buscar_ej1}
> ${botTag} ${t.buscar_ej2}

> ${botTag} ${t.def_ej1}
> ${botTag} ${t.def_ej2}

> ${botTag} ${t.pers_ej1}
> ${botTag} ${t.pers_ej2}

> ${botTag} ${t.fecha_ej1}
> ${botTag} ${t.fecha_ej2}

> ${botTag} ${t.lugar_ej1}
> ${botTag} ${t.lugar_ej2}

> ${botTag} ${t.porque_ej1}
> ${botTag} ${t.porque_ej2}

> ${botTag} ${t.medida_ej1}
> ${botTag} ${t.medida_ej2}

> ${botTag} ${t.sign_ej1}
> ${botTag} ${t.sign_ej2}

${t.juegos_titulo}

> ${botTag} ${t.veo1}
> ${botTag} ${t.veo2}
> ${botTag} ${t.veo3}

> ${botTag} ${t.ahorcado1}
> ${botTag} ${t.ahorcado2}

${t.rpg_titulo}

> ${botTag} ${t.rpg1}
> ${botTag} ${t.rpg2}
> ${botTag} ${t.rpg3}
> ${botTag} ${t.rpg4}
> ${botTag} ${t.rpg5}

${t.mate_titulo}

> ${botTag} ${t.mate1}
> ${botTag} ${t.mate2}
> ${botTag} ${t.mate3}
> ${botTag} ${t.mate4}
> ${botTag} ${t.mate5}

${t.media_titulo}

> ${botTag} ${t.img1}
> ${botTag} ${t.img2}

> ${botTag} ${t.stick1}
> ${botTag} ${t.stick2}
> ${botTag} ${t.stick3}
> ${botTag} ${t.stick4}

> ${botTag} ${t.ocr}

${t.descargas_titulo}

> ${botTag} ${t.desc1}
> ${botTag} ${t.desc2}
> ${botTag} ${t.desc3}

${t.utilidades_titulo}

> ${botTag} ${t.util1}
> ${botTag} ${t.util2}
> ${botTag} ${t.util3}
> ${botTag} ${t.util4}

${t.mod_titulo} ${t.mod_solo_admins}

> ${botTag} ${t.mod1}
> ${botTag} ${t.mod2}
> ${botTag} ${t.mod3}
> ${botTag} ${t.mod4}
> ${botTag} ${t.mod5}
> ${botTag} ${t.mod6}
> ${botTag} ${t.mod7}

${t.config_titulo} ${t.mod_solo_admins}

> ${botTag} ${t.config1}
> ${botTag} ${t.config2}
> ${botTag} ${t.config3}
> ${botTag} ${t.config4}
> ${botTag} ${t.config5}
> ${botTag} ${t.config6}
> ${botTag} ${t.config7}
> ${botTag} ${t.config8}
> ${botTag} ${t.config9}

${t.charla_titulo}
${t.charla_desc}

> ${botTag} ${t.charla1}
> ${botTag} ${t.charla2}
> ${botTag} ${t.charla3}
> ${botTag} ${t.charla4}
> ${botTag} ${t.charla5}

${t.footer}
`.trim()

    await conn.sendMessage(m.chat, {
      text: str,
      mentions: [m.sender, botJid]
    }, { quoted: m })

  } catch (e) {
    console.error('iamenu error:', e)
    conn.reply(m.chat, '❌ Error al mostrar el menú de IA', m)
  }
}

handler.command = /^(iamenu|menuia|menusia|aimenú|aimenu|lunamenu)$/i
handler.exp = 10
handler.fail = null

export default handler