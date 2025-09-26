import fs from 'fs';

const handler = async (m, {conn, usedPrefix, text, command}) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es';
  
  let tradutor;
  try {
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
    tradutor = _translate.plugins.cmd_del;
  } catch (e) {
    tradutor = {
      texto1: "Proporciona un hash o cita un sticker. Usa",
      texto2: "Este comando está bloqueado y no se puede eliminar",
      texto3: "Comando eliminado exitosamente"
    };
  }

  let hash = text;
  
  if (m.quoted && m.quoted.fileSha256) {
    const rawHash = m.quoted.fileSha256;
    
    if (Buffer.isBuffer(rawHash)) {
      hash = rawHash.toString('base64');
    } else if (typeof rawHash === 'string') {
      hash = rawHash;
    } else {
      hash = Buffer.from(rawHash).toString('base64');
    }
  }
  
  if (!hash) throw `*${tradutor.texto1} ${usedPrefix}listcmd*`;
  
  if (!global.db.data.sticker) global.db.data.sticker = {};
  
  const sticker = global.db.data.sticker;
  
  if (!sticker[hash]) throw `*No existe un comando para este sticker*`;
  
  if (sticker[hash] && sticker[hash].locked) throw `*${tradutor.texto2}*`;
  
  const cmdInfo = sticker[hash];
  const preview = cmdInfo.text?.slice(0, 50) + (cmdInfo.text?.length > 50 ? '...' : '');
  
  delete sticker[hash];
  m.reply(`*${tradutor.texto3}*\n\n*Comando eliminado:* ${preview}`);
};

handler.command = ['delcmd'];
handler.rowner = true;
export default handler;