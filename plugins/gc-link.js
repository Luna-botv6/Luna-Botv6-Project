import fs from 'fs';
import { getGroupDataForPlugin } from '../lib/funcion/pluginHelper.js';
import { prepareWAMessageMedia, generateWAMessageFromContent } from '@whiskeysockets/baileys';

const handler = async (m, { conn }) => {
  if (!m.isGroup) return m.reply('*[◉] Este comando solo funciona en grupos.*');

  const { groupMetadata, isAdmin, isBotAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender);

  if (!isAdmin) return m.reply('*[◉] Solo los administradores pueden usar este comando.*');
  if (!isBotAdmin) return m.reply('*[◉] El bot necesita ser administrador para mostrar el enlace.*');

  const datas = global;
  const idioma = datas.db?.data?.users[m.sender]?.language || global.defaultLenguaje || 'es';
  let tradutor;
  try {
    const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
    tradutor = _translate.plugins.gc_link || { texto1: ['Enlace del grupo'] };
  } catch {
    tradutor = { texto1: ['Enlace del grupo'] };
  }

  let ppgc;
  try {
    ppgc = await conn.profilePictureUrl(m.chat, 'image');
  } catch {
    ppgc = 'https://i.ibb.co/RBx5SQC/avatar-group-large-v2.png';
  }

  const ppgcbuff = await conn.getFile(ppgc);
  const linkcode = await conn.groupInviteCode(m.chat);

  try {
    const messa = await prepareWAMessageMedia({ image: ppgcbuff.data }, { upload: conn.waUploadToServer });
    const msg = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          interactiveMessage: {
            body: { text: `https://chat.whatsapp.com/${linkcode}` },
            footer: { text: `${global.wm}`.trim() },
            header: {
              hasMediaAttachment: true,
              imageMessage: messa.imageMessage,
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: 'cta_copy',
                  buttonParamsJson: JSON.stringify({
                    display_text: 'COPIAR LINK',
                    copy_code: `https://chat.whatsapp.com/${linkcode}`,
                    id: `https://chat.whatsapp.com/${linkcode}`
                  })
                }
              ],
              messageParamsJson: "",
            },
          },
        },
      }
    }, { userJid: conn.user.jid, quoted: m });

    conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id });
  } catch {
    conn.reply(m.chat, `https://chat.whatsapp.com/${linkcode}`, m, {
      contextInfo: {
        externalAdReply: {
          mediaUrl: null,
          mediaType: 1,
          description: null,
          title: tradutor.texto1[0],
          body: 'LUNA - 𝙱𝚘𝚝',
          previewType: 0,
          thumbnail: fs.readFileSync('./src/assets/images/menu/languages/es/menu.png'),
          sourceUrl: ''
        }
      }
    });
  }
};

handler.help = ['linkgroup'];
handler.tags = ['group'];
handler.command = /^(link(gro?up)?)$/i;
handler.group = true;

export default handler;