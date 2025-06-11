import fs from 'fs'

const handler = async (m, { conn }) => {
  const vn = './src/assets/audio/01J6748ZEBTQ21HT69937WGM4D.mp3';

  if (!fs.existsSync(vn)) {
    return m.reply('❌ No se encontró el archivo de audio.');
  }

  await conn.sendMessage(m.chat, {
    audio: { url: vn },
    mimetype: 'audio/mpeg',
    ptt: true
  }, { quoted: m });
};

handler.customPrefix = /^(:c|)$/i;
handler.command = new RegExp;
export default handler;