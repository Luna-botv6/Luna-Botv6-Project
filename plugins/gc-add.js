
import { default as baileys } from '@whiskeysockets/baileys';
import fs from 'fs';
import fetch from 'node-fetch';

const { generateWAMessageFromContent, prepareWAMessageMedia, proto } = baileys;

const handler = async (m, { conn, text, participants, args }) => {
  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`, 'utf8'));
  const tradutor = _translate.plugins.gc_add;

  // Verificar si el bot es admin
  const groupMetadata = await conn.groupMetadata(m.chat);
  const botParticipant = groupMetadata.participants.find((p) => p.id === conn.user.jid);
  const isBotAdmin = botParticipant?.admin === 'admin' || false;

  if (!isBotAdmin) {
    return m.reply('*[❗] No soy administrador, por lo que solo puedo enviar invitaciones, pero no agregar directamente.*');
  }

  if (!args[0]) throw tradutor.texto2;

  // Procesar los números a invitar
  const numbers = text.split(',')
    .map((v) => v.replace(/[^0-9]/g, ''))
    .filter((v) => v.length > 4 && v.length < 20);

  if (numbers.length === 0) {
    throw tradutor.texto5; // Usa tu mensaje de "no se pudo agregar"
  }

  const pp = await conn.profilePictureUrl(m.chat).catch(() => null);
  const jpegThumbnail = pp ? await (await fetch(pp)).buffer() : Buffer.alloc(0);

  const groupName = await conn.getName(m.chat);
  const captionn = tradutor.texto4;
  const invitadorTag = `@${m.sender.split('@')[0]}`;

  for (const num of numbers) {
    const jid = num + '@s.whatsapp.net';
    try {
      // Generar el enlace de invitación
      const invite_code = await conn.groupInviteCode(m.chat);
      const invite_code_exp = Math.floor(Date.now() / 1000) + (3 * 24 * 60 * 60); // 3 días

      // Mensaje al grupo informando que se envió la invitación
      const avisoGrupo = `✅ Se ha enviado una invitación a @${num} para unirse al grupo, por solicitud de ${invitadorTag}.`;
      await conn.sendMessage(m.chat, { text: avisoGrupo, mentions: [jid, m.sender] });

      // Mensaje privado al usuario con la invitación
      const messaa = await prepareWAMessageMedia({ image: jpegThumbnail }, { upload: conn.waUploadToServer });
      const groupInvite = generateWAMessageFromContent(
        m.chat,
        proto.Message.fromObject({
          groupInviteMessage: {
            groupJid: m.chat,
            inviteCode: invite_code,
            inviteExpiration: invite_code_exp,
            groupName: groupName,
            caption: `¡Hola @${num}! ${invitadorTag} quiere que te unas a *${groupName}*.\n\n¡Te esperamos!`,
            jpegThumbnail: jpegThumbnail
          }
        }),
        { userJid: jid }
      );

      await conn.relayMessage(jid, groupInvite.message, { messageId: groupInvite.key.id });

      // Confirmación al grupo
      await conn.sendMessage(m.chat, {
        text: `📩 Invitación enviada a @${num}. ¡Esperamos que se una pronto!`,
        mentions: [jid]
      });
    } catch (err) {
      console.error(err);
      await conn.sendMessage(m.chat, {
        text: `⚠️ No se pudo enviar la invitación a @${num}. Puede que tenga privacidad activada o haya un error.`,
        mentions: [jid]
      });
    }
  }
};

handler.help = ['invite', 'invitación'].map((v) => v + ' número');
handler.tags = ['group'];
handler.command = /^(add|agregar|invitar)$/i;
handler.admin = handler.group = handler.botAdmin = true;

export default handler;