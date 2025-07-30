import fs from 'fs';
import { downloadContentFromMessage } from '@whiskeysockets/baileys';

let handler = async function (m, { conn }) {
  const datas = global;
  const idioma = datas.db.data.users[m.sender]?.language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.antiviewonce;

  const chat = global.db.data.chats[m.chat];
  if (!chat?.antiviewonce || chat?.isBanned) return;

  if (m.mtype === 'viewOnceMessageV2') {
    const viewOnceMessage = m.message.viewOnceMessageV2?.message;
    if (!viewOnceMessage) return;

    const type = Object.keys(viewOnceMessage)[0];
    const mediaMessage = viewOnceMessage[type];

    const stream = await downloadContentFromMessage(mediaMessage, type === 'imageMessage' ? 'image' : 'video');
    let buffer = Buffer.from([]);
    for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

    const caption = (mediaMessage.caption || '') + '\n\n' + (tradutor?.texto1 || 'Aquí no se oculta nada 😏');

    if (type.includes('image')) {
      await conn.sendFile(m.chat, buffer, 'viewonce.jpg', caption, m);
    } else if (type.includes('video')) {
      await conn.sendFile(m.chat, buffer, 'viewonce.mp4', caption, m);
    }
  }
};

export default {
  before: handler,
};
