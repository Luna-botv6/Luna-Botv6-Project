import fs from 'fs';
import { setConfig } from '../lib/funcConfig.js'; 

const handler = async (m, { conn, args, usedPrefix, command, isAdmin }) => {
  if (!isAdmin) return m.reply('*[❌] Solo los administradores pueden usar este comando.*');

  // Idioma dinámico
  const datas = global;
  const idioma = datas.db?.data?.users[m.sender]?.language || global.defaultLenguaje || 'es';
  let tradutor;
  try {
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
    tradutor = _translate.plugins.gc_config || { texto1: ["Modo de grupo cambiado"] };
  } catch {
    tradutor = { texto1: ["Modo de grupo cambiado"] };
  }

  
  const option = (args[0] || '').toLowerCase();

  const states = {
    'open': 'not_announcement',
    'close': 'announcement',
    'abierto': 'not_announcement',
    'cerrado': 'announcement',
    'abrir': 'not_announcement',
    'cerrar': 'announcement',
  };

  const isClose = states[option];

  if (!isClose) {
    return m.reply(`
*[❗] FORMATO ERRÓNEO!!*
${tradutor.texto1[0]}
*Ejemplos de uso:*
> ${usedPrefix + command} abrir
> ${usedPrefix + command} cerrar
`.trim());
  }

  
  let updated = false;
  try {
    await conn.groupSettingUpdate(m.chat, isClose);
    updated = true;
  } catch {
    updated = false;
  }

  
  setConfig(m.chat, { groupMode: isClose === 'announcement' ? 'cerrado' : 'abierto' });

  if (updated) {
    m.reply(`✅ Estado del grupo cambiado a: *${isClose === 'announcement' ? '🔒 CERRADO' : '🔓 ABIERTO'}*`);
  } else {
    m.reply(`❌ No pude cambiar el estado del grupo.\n\nEl bot necesita ser *administrador*.`);
  }
};

handler.help = ['grupo abrir', 'grupo cerrar'];
handler.tags = ['group'];
handler.command = /^(grupo|group)$/i;

export default handler;
