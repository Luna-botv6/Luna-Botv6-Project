import fs from 'fs';

const handler = async (m, {conn, text, usedPrefix, command}) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es';
  
  let tradutor;
  try {
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
    tradutor = _translate.plugins.cmd_add;
  } catch (e) {
    tradutor = {
      texto1: "❌ Responde a un sticker",
      texto2: "❌ El sticker debe tener un hash válido",
      texto3: [
        "❌ Falta el texto del comando",
        "texto de respuesta",
        "Ejemplo con mención:",
        "Hola @usuario"
      ],
      texto4: "❌ Este comando está bloqueado",
      texto5: "✅ Comando agregado exitosamente"
    };
  }
  
  if (!global.db.data.sticker) global.db.data.sticker = {};
  
  if (!m.quoted) throw `*${tradutor.texto1}*`;
  if (!m.quoted.fileSha256) throw `*${tradutor.texto2}*`;
  if (!text) throw `*${tradutor.texto3[0]}*\n*—◉ ${usedPrefix + command} ${tradutor.texto3[1]}*\n\n*${tradutor.texto3[2]}*\n*—◉ ${usedPrefix + command} <#menu> ${tradutor.texto3[3]}*`;
  
  const sticker = global.db.data.sticker;
  
  let hash;
  const rawHash = m.quoted.fileSha256;
  
  if (Buffer.isBuffer(rawHash)) {
    hash = rawHash.toString('base64');
  } else if (typeof rawHash === 'string') {
    hash = rawHash;
  } else {
    hash = Buffer.from(rawHash).toString('base64');
  }
  
  if (sticker[hash] && sticker[hash].locked) throw `*${tradutor.texto4}*`;
  
  const commandPrefixes = ['.', '#', '!', '/'];
  const isCommand = commandPrefixes.some(prefix => text.startsWith(prefix));
  const executeOnly = isCommand;
  
  sticker[hash] = {
    text: text,
    mentionedJid: m.mentionedJid || [], 
    creator: m.sender, 
    at: Date.now(), 
    locked: false,
    executeOnly: executeOnly
  };
  
  const typeMsg = executeOnly ? 'Comando (solo ejecución)' : 'Texto normal';
  m.reply(`*${tradutor.texto5}*\n\n*Tipo:* ${typeMsg}\n*Contenido:* ${text.slice(0, 50)}${text.length > 50 ? '...' : ''}\n\n_Ahora envía el sticker para probar_`);
};

handler.command = ['setcmd', 'addcmd', 'cmdadd', 'cmdset'];
handler.rowner = true;
export default handler;