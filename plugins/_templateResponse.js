import { proto, generateWAMessage, areJidsSameUser } from '@whiskeysockets/baileys'

const handler = async function (m, { conn, chatUpdate }) {
  if (m.isBaileys || !m.message) return;

  let id = null;

  if (m.message.buttonsResponseMessage) {
    id = m.message.buttonsResponseMessage.selectedButtonId;
  } else if (m.message.templateButtonReplyMessage) {
    id = m.message.templateButtonReplyMessage.selectedId;
  } else if (m.message.listResponseMessage) {
    id = m.message.listResponseMessage.singleSelectReply?.selectedRowId;
  } else if (m.message.interactiveResponseMessage) {
    try {
      id = JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id;
    } catch (e) {
      // ignorar errores si no se puede parsear
    }
  }

  const text =
    m.message.buttonsResponseMessage?.selectedDisplayText ||
    m.message.templateButtonReplyMessage?.selectedDisplayText ||
    m.message.listResponseMessage?.title;

  if (!id) return;

  const messages = await generateWAMessage(
    m.chat,
    { text: id, mentions: m.mentionedJid },
    {
      userJid: conn.user.id,
      quoted: m.quoted && m.quoted.fakeObj,
    }
  );

  messages.key.fromMe = areJidsSameUser(m.sender, conn.user.id);
  messages.key.id = m.key.id;
  messages.pushName = m.pushName;

  if (m.isGroup) {
    messages.key.participant = messages.participant = m.sender;
  }

  const msg = {
    ...chatUpdate,
    messages: [proto.WebMessageInfo.fromObject(messages)],
    type: 'append',
  };

  conn.ev.emit('messages.upsert', msg);
};

handler.all = true;
export default handler;
