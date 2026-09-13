import { getUserStats, getRoleByLevel } from '../lib/stats.js';

const SEP = '═'.repeat(22);

const handler = async (m, { conn, isPrems }) => {
  try {
    const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje || 'es';
    const _tr = await global.loadTranslation(idioma);
    const t = _tr?.plugins?.iamenu || {};

    const stats = getUserStats(m.sender);
    const role = getRoleByLevel(stats.level);

    const { money, exp, level, limit, premiumTime } = stats;
    const taguser = `@${m.sender.split('@')[0]}`;
    const isPrem = premiumTime > 0 || isPrems;
    const botJid = conn.user?.jid || conn.user?.id || '';
    const botTag = `@${botJid.split('@')[0]}`;
    const readMore = String.fromCharCode(8206).repeat(850);

    const card = (emoji, titulo, desc, items) => {
      const ejemplos = items.map(x => `▸ ${x}`).join('\n');
      return `${SEP}\n${emoji} *${titulo}*\n${desc ? `_${desc}_\n` : ''}${ejemplos}`;
    };

    const str = `
*${t.titulo}*

👤 *${t.perfil}* ${taguser}
📊 ${t.nivel}: ${level}
⭐ Exp: ${exp}
🎯 ${t.rango}: ${role}
💰 ${money} | 🎫 ${t.limite}: ${limit}
💎 ${t.premium}: ${isPrem ? t.premium_si : t.premium_no}

${readMore}

${card('🧠', t.uso_titulo, t.uso_desc, [`${botTag} ${t.uso_ejemplo}`])}

${card('💬', t.charla_titulo, t.charla_desc, [`${botTag} ${t.charla1}`, `${botTag} ${t.charla2}`, `${botTag} ${t.charla3}`])}

${card('📚', t.buscar_titulo, t.buscar_desc, [`${botTag} ${t.buscar1}`, `${botTag} ${t.buscar2}`, `${botTag} ${t.buscar3}`, `${botTag} ${t.buscar4}`, `${botTag} ${t.buscar5}`, `${botTag} ${t.buscar6}`])}

${card('🧮', t.mate_titulo, '', [`${botTag} ${t.mate1}`, `${botTag} ${t.mate2}`, `${botTag} ${t.mate3}`, `${botTag} ${t.mate4}`])}

${card('🌍', t.mundo_titulo, '', [`${botTag} ${t.mundo1}`, `${botTag} ${t.mundo2}`, `${botTag} ${t.mundo3}`, `${botTag} ${t.mundo4}`, `${botTag} ${t.mundo5}`])}

${card('🎨', t.img_titulo, '', [`${botTag} ${t.img1}`, `${botTag} ${t.img2}`, `${botTag} ${t.img3}`])}

${card('🎵', t.musica_titulo, '', [`${botTag} ${t.mus1}`, `${botTag} ${t.mus2}`, `${botTag} ${t.mus3}`])}

${card('⬇️', t.desc_titulo, '', [`${botTag} ${t.desc1}`, `${botTag} ${t.desc2}`, `${botTag} ${t.desc3}`])}

${card('🎮', t.juegos_titulo, '', [`${botTag} ${t.juego1}`, `${botTag} ${t.juego2}`])}

${card('⚔️', t.rpg_titulo, '', [`${botTag} ${t.rpg1}`, `${botTag} ${t.rpg2}`, `${botTag} ${t.rpg3}`, `${botTag} ${t.rpg4}`])}

${card('🛡️', t.mod_titulo, `_${t.mod_solo_admins}_`, [`${botTag} ${t.mod1}`, `${botTag} ${t.mod2}`, `${botTag} ${t.mod3}`, `${botTag} ${t.mod4}`])}

${card('⚙️', t.config_titulo, `_${t.mod_solo_admins}_`, [`${botTag} ${t.config1}`, `${botTag} ${t.config2}`, `${botTag} ${t.config3}`, `${botTag} ${t.config4}`, `${botTag} ${t.config5}`, `${botTag} ${t.config6}`])}

${t.footer}
`.trim();

    await conn.sendMessage(m.chat, {
      text: str,
      mentions: [m.sender, botJid]
    }, { quoted: m });

  } catch (e) {
    console.error('iamenu error:', e);
    conn.reply(m.chat, '❌ Error al mostrar el menú de IA', m);
  }
};

handler.command = /^(iamenu|menuia|menusia|aimenú|aimenu|lunamenu)$/i;
handler.exp = 10;
handler.fail = null;

export default handler;