import { canLevelUp, xpRange } from '../lib/levelling.js';
import { levelup } from '../lib/canvas.js';
import * as stats from '../lib/stats.js';

const handler = async (m, { conn }) => {
  const datas = global;
  const idioma = datas.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje;
  const _translate = JSON.parse(await fs.promises.readFile(`./src/languages/${idioma}.json`, 'utf-8'));
  const tradutor = _translate.plugins.rpg_levelup;

  const name = await conn.getName(m.sender);
  const usertag = '@' + m.sender.split('@')[0];

  // Obtener stats del usuario desde lib/stats.js
  let userStats = stats.getUserStats(m.sender);

  if (!userStats) {
    userStats = { level: 0, exp: 0, role: '🧰 Novato' };
    stats.setUserStats(m.sender, userStats);
  }

  // Checar si puede subir nivel con la experiencia actual
  if (!canLevelUp(userStats.level, userStats.exp, global.multiplier)) {
    const { min, xp, max } = xpRange(userStats.level, global.multiplier);
    const message = `
${tradutor.texto1[0]}
${tradutor.texto1[1]} ${usertag}!

${tradutor.texto1[2]} ${userStats.level}
${tradutor.texto1[3]} ${stats.getRoleByLevel(userStats.level)}
${tradutor.texto1[4]} ${userStats.exp - min}/${xp}

${tradutor.texto1[5]} ${max - userStats.exp} ${tradutor.texto1[6]}
`.trim();

    return conn.sendMessage(m.chat, { text: message, mentions: [m.sender] }, { quoted: m });
  }

  const before = userStats.level;

  // Subir nivel si la experiencia alcanza
  while (canLevelUp(userStats.level, userStats.exp, global.multiplier)) {
    userStats.level++;
    // Ajustar experiencia para nivel siguiente
    const { max } = xpRange(userStats.level - 1, global.multiplier);
    userStats.exp -= max;
  }

  if (before !== userStats.level) {
    userStats.role = stats.getRoleByLevel(userStats.level);
    stats.setUserStats(m.sender, userStats);

    const levelUpMessage = `${tradutor.texto2[0]} ${name}! ${tradutor.texto2[1]} ${userStats.level}`;
    const levelUpDetails = `
${tradutor.texto3[0]}

${tradutor.texto3[1]} ${before}
${tradutor.texto3[2]} ${userStats.level}
${tradutor.texto3[3]} ${userStats.role}

${tradutor.texto3[4]}
`.trim();

    try {
      const levelUpImage = await levelup(levelUpMessage, userStats.level);
      conn.sendFile(m.chat, levelUpImage, 'levelup.jpg', levelUpDetails, m);
    } catch {
      conn.sendMessage(m.chat, { text: levelUpDetails, mentions: [m.sender] }, { quoted: m });
    }
  }
};

handler.help = ['nivel', 'lvl', 'levelup', 'level'];
handler.tags = ['xp'];
handler.command = ['nivel', 'lvl', 'levelup', 'level'];
export default handler;