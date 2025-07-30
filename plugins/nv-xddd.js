import fs from 'fs'

const handler = async (m, { conn }) => {
  const vn = './src/assets/audio/xddd.mp3';

  if (!fs.existsSync(vn)) {
    return m.reply('❌ No se encontró el archivo de audio.');
  }

  await conn.sendMessage(m.chat, {
    audio: { url: vn },
    mimetype: 'audio/mpeg',
    ptt: true
  }, { quoted: m });
};

handler.customPrefix = /^(árabe|Árabe|arabe|Arabe|)$/i;
handler.command = new RegExp;
export default handler;