import { extractCommands, buildSections } from '../lib/funcion/menuGenerator.js';

const handler = async (m, { conn, usedPrefix }) => {
  const idioma = global.db?.data?.users?.[m.sender]?.language || global.defaultLenguaje || 'es';
  const _translate = await global.loadTranslation(idioma);
  const t = _translate?.menu || {};

  const secciones = buildSections(extractCommands(global.plugins || {}), usedPrefix, t);

  const str = `╭━━━━━━━━━━━━━━━━━━━╮
┃  🌙 *${global.BotName || 'Luna-Botv6'} FULL MENU* 🌙
╰━━━━━━━━━━━━━━━━━━━╯

${secciones}

╭━━━━━━━━━━━━━━━━━━━╮
┃  🌙 *${global.BotName || 'Luna-Botv6'}* 🌙
┃  ${t.creado || 'Hecho con 💜'}
╰━━━━━━━━━━━━━━━━━━━╯`.trim();

  await conn.sendMessage(m.chat, { text: str }, { quoted: m });
};

handler.command = /^(masmenu|maismenu|fullmenu|todomenu|menufull)$/i;
handler.exp = 50;
handler.fail = null;

export default handler;