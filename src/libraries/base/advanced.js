import PhoneNumber from 'awesome-phonenumber';
import {
  proto,
  generateForwardMessageContent,
  generateWAMessageFromContent,
  areJidsSameUser,
  WAMessageStubType
} from '@whiskeysockets/baileys';

function nullish(args) {
  return !(args !== null && args !== undefined);
}

export const advancedUtils = {
  async relayWAMessage(conn, pesanfull) {
    if (pesanfull.message.audioMessage) {
      await conn.sendPresenceUpdate('recording', pesanfull.key.remoteJid);
    } else {
      await conn.sendPresenceUpdate('composing', pesanfull.key.remoteJid);
    }
    const mekirim = await conn.relayMessage(pesanfull.key.remoteJid, pesanfull.message, {messageId: pesanfull.key.id});
    conn.ev.emit('messages.upsert', {messages: [pesanfull], type: 'append'});
    return mekirim;
  },

  async sendHydrated(conn, jid, text = '', footer = '', buffer, url, urlText, call, callText, buttons, quoted, options) {
    let type;
    if (buffer) {
      try {
        (type = await conn.getFile(buffer), buffer = type.data);
      } catch {
        buffer = buffer;
      }
    }
    if (buffer && !Buffer.isBuffer(buffer) && (typeof buffer === 'string' || Array.isArray(buffer))) (options = quoted, quoted = buttons, buttons = callText, callText = call, call = urlText, urlText = url, url = buffer, buffer = null);
    if (!options) options = {};
    const templateButtons = [];
    if (url || urlText) {
      if (!Array.isArray(url)) url = [url];
      if (!Array.isArray(urlText)) urlText = [urlText];
      templateButtons.push(...(
        url.map((v, i) => [v, urlText[i]])
          .map(([url, urlText], i) => ({
            index: templateButtons.length + i + 1,
            urlButton: {
              displayText: !nullish(urlText) && urlText || !nullish(url) && url || '',
              url: !nullish(url) && url || !nullish(urlText) && urlText || '',
            },
          })) || []
      ));
    }
    if (call || callText) {
      if (!Array.isArray(call)) call = [call];
      if (!Array.isArray(callText)) callText = [callText];
      templateButtons.push(...(
        call.map((v, i) => [v, callText[i]])
          .map(([call, callText], i) => ({
            index: templateButtons.length + i + 1,
            callButton: {
              displayText: !nullish(callText) && callText || !nullish(call) && call || '',
              phoneNumber: !nullish(call) && call || !nullish(callText) && callText || '',
            },
          })) || []
      ));
    }
    if (buttons.length) {
      if (!Array.isArray(buttons[0])) buttons = [buttons];
      templateButtons.push(...(
        buttons.map(([text, id], index) => ({
          index: templateButtons.length + index + 1,
          quickReplyButton: {
            displayText: !nullish(text) && text || !nullish(id) && id || '',
            id: !nullish(id) && id || !nullish(text) && text || '',
          },
        })) || []
      ));
    }
    const message = {
      ...options,
      [buffer ? 'caption' : 'text']: text || '',
      footer,
      templateButtons,
      ...(buffer ?
        options.asLocation && /image/.test(type.mime) ? {
          location: {
            ...options,
            jpegThumbnail: buffer,
          },
        } : {
          [/video/.test(type.mime) ? 'video' : /image/.test(type.mime) ? 'image' : 'document']: buffer,
        } : {}),
    };
    return await conn.sendMessage(jid, message, {
      quoted,
      upload: conn.waUploadToServer,
      ...options,
    });
  },

  async sendHydrated2(conn, jid, text = '', footer = '', buffer, url, urlText, url2, urlText2, buttons, quoted, options) {
    let type;
    if (buffer) {
      try {
        (type = await conn.getFile(buffer), buffer = type.data);
      } catch {
        buffer = buffer;
      }
    }
    if (buffer && !Buffer.isBuffer(buffer) && (typeof buffer === 'string' || Array.isArray(buffer))) (options = quoted, quoted = buttons, buttons = urlText2, urlText2 = url2, url2 = urlText, urlText = url, url = buffer, buffer = null);
    if (!options) options = {};
    const templateButtons = [];
    if (url || urlText) {
      if (!Array.isArray(url)) url = [url];
      if (!Array.isArray(urlText)) urlText = [urlText];
      templateButtons.push(...(
        url.map((v, i) => [v, urlText[i]])
          .map(([url, urlText], i) => ({
            index: templateButtons.length + i + 1,
            urlButton: {
              displayText: !nullish(urlText) && urlText || !nullish(url) && url || '',
              url: !nullish(url) && url || !nullish(urlText) && urlText || '',
            },
          })) || []
      ));
    }
    if (url2 || urlText2) {
      if (!Array.isArray(url2)) url2 = [url2];
      if (!Array.isArray(urlText2)) urlText2 = [urlText2];
      templateButtons.push(...(
        url2.map((v, i) => [v, urlText2[i]])
          .map(([url2, urlText2], i) => ({
            index: templateButtons.length + i + 1,
            urlButton: {
              displayText: !nullish(urlText2) && urlText2 || !nullish(url2) && url2 || '',
              url: !nullish(url2) && url2 || !nullish(urlText2) && urlText2 || '',
            },
          })) || []
      ));
    }
    if (buttons.length) {
      if (!Array.isArray(buttons[0])) buttons = [buttons];
      templateButtons.push(...(
        buttons.map(([text, id], index) => ({
          index: templateButtons.length + index + 1,
          quickReplyButton: {
            displayText: !nullish(text) && text || !nullish(id) && id || '',
            id: !nullish(id) && id || !nullish(text) && text || '',
          },
        })) || []
      ));
    }
    const message = {
      ...options,
      [buffer ? 'caption' : 'text']: text || '',
      footer,
      templateButtons,
      ...(buffer ?
        options.asLocation && /image/.test(type.mime) ? {
          location: {
            ...options,
            jpegThumbnail: buffer,
          },
        } : {
          [/video/.test(type.mime) ? 'video' : /image/.test(type.mime) ? 'image' : 'document']: buffer,
        } : {}),
    };
    return await conn.sendMessage(jid, message, {
      quoted,
      upload: conn.waUploadToServer,
      ...options,
    });
  },

  cMod(conn, jid, message, text = '', sender = conn.user.jid, options = {}) {
    if (options.mentions && !Array.isArray(options.mentions)) options.mentions = [options.mentions];
    const copy = message.toJSON();
    delete copy.message.messageContextInfo;
    delete copy.message.senderKeyDistributionMessage;
    const mtype = Object.keys(copy.message)[0];
    const msg = copy.message;
    const content = msg[mtype];
    if (typeof content === 'string') msg[mtype] = text || content;
    else if (content.caption) content.caption = text || content.caption;
    else if (content.text) content.text = text || content.text;
    if (typeof content !== 'string') {
      msg[mtype] = {...content, ...options};
      msg[mtype].contextInfo = {
        ...(content.contextInfo || {}),
        mentionedJid: options.mentions || content.contextInfo?.mentionedJid || [],
      };
    }
    if (copy.participant) sender = copy.participant = sender || copy.participant;
    else if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant;
    if (copy.key.remoteJid.includes('@s.whatsapp.net')) sender = sender || copy.key.remoteJid;
    else if (copy.key.remoteJid.includes('@broadcast')) sender = sender || copy.key.remoteJid;
    copy.key.remoteJid = jid;
    copy.key.fromMe = areJidsSameUser(sender, conn.user.id) || false;
    return proto.WebMessageInfo.fromObject(copy);
  },

  async copyNForward(conn, jid, message, forwardingScore = true, options = {}) {
    let vtype;
    if (options.readViewOnce && message.message.viewOnceMessage?.message) {
      vtype = Object.keys(message.message.viewOnceMessage.message)[0];
      delete message.message.viewOnceMessage.message[vtype].viewOnce;
      message.message = proto.Message.fromObject(
        JSON.parse(JSON.stringify(message.message.viewOnceMessage.message)),
      );
      message.message[vtype].contextInfo = message.message.viewOnceMessage.contextInfo;
    }
    const mtype = Object.keys(message.message)[0];
    let m = generateForwardMessageContent(message, !!forwardingScore);
    const ctype = Object.keys(m)[0];
    if (forwardingScore && typeof forwardingScore === 'number' && forwardingScore > 1) m[ctype].contextInfo.forwardingScore += forwardingScore;
    m[ctype].contextInfo = {
      ...(message.message[mtype].contextInfo || {}),
      ...(m[ctype].contextInfo || {}),
    };
    m = generateWAMessageFromContent(jid, m, {
      ...options,
      userJid: conn.user.jid,
    });
    await conn.relayMessage(jid, m.message, {messageId: m.key.id, additionalAttributes: {...options}});
    return m;
  },

  fakeReply(conn, jid, text = '', fakeJid = conn.user.jid, fakeText = '', fakeGroupJid, options) {
    return conn.reply(jid, text, {key: {fromMe: areJidsSameUser(fakeJid, conn.user.id), participant: fakeJid, ...(fakeGroupJid ? {remoteJid: fakeGroupJid} : {})}, message: {conversation: fakeText}, ...options});
  },

  async sendGroupV4Invite(conn, jid, participant, inviteCode, inviteExpiration, groupName = 'unknown subject', caption = 'Invitation to join my WhatsApp group', jpegThumbnail, options = {}) {
    const msg = proto.Message.fromObject({
      groupInviteMessage: proto.GroupInviteMessage.fromObject({
        inviteCode,
        inviteExpiration: parseInt(inviteExpiration) || + new Date(new Date + (3 * 86400000)),
        groupJid: jid,
        groupName: (groupName ? groupName : await conn.getName(jid)) || null,
        jpegThumbnail: Buffer.isBuffer(jpegThumbnail) ? jpegThumbnail : null,
        caption,
      }),
    });
    const message = generateWAMessageFromContent(participant, msg, options);
    await conn.relayMessage(participant, message.message, {messageId: message.key.id, additionalAttributes: {...options}});
    return message;
  },

  async processMessageStubType(conn, m) {
    if (!m.messageStubType) return;
    const chat = conn.decodeJid(m.key.remoteJid || m.message?.senderKeyDistributionMessage?.groupId || '');
    if (!chat || chat === 'status@broadcast') return;
    const emitGroupUpdate = (update) => {
      conn.ev.emit('groups.update', [{id: chat, ...update}]);
    };
    switch (m.messageStubType) {
      case WAMessageStubType.REVOKE:
      case WAMessageStubType.GROUP_CHANGE_INVITE_LINK:
        emitGroupUpdate({revoke: m.messageStubParameters[0]});
        break;
      case WAMessageStubType.GROUP_CHANGE_ICON:
        emitGroupUpdate({icon: m.messageStubParameters[0]});
        break;
      default: {
        console.log({
          messageStubType: m.messageStubType,
          messageStubParameters: m.messageStubParameters,
          type: WAMessageStubType[m.messageStubType],
        });
        break;
      }
    }
    const isGroup = chat.endsWith('@g.us');
    if (!isGroup) return;
    let chats = conn.chats[chat];
    if (!chats) chats = conn.chats[chat] = {id: chat};
    chats.isChats = true;
    const metadata = await conn.groupMetadata(chat).catch((_) => null);
    if (!metadata) return;
    chats.subject = metadata.subject;
    chats.metadata = metadata;
  },

  async insertAllGroup(conn) {
    const groups = await conn.groupFetchAllParticipating().catch((_) => null) || {};
    for (const group in groups) conn.chats[group] = {...(conn.chats[group] || {}), id: group, subject: groups[group].subject, isChats: true, metadata: groups[group]};
    return conn.chats;
  },

  getName(conn, jid = '', withoutContact = false) {
    jid = conn.decodeJid(jid);
    withoutContact = conn.withoutContact || withoutContact;
    let v;
    if (jid.endsWith('@g.us')) {
      return new Promise(async (resolve) => {
        v = conn.chats[jid] || {};
        if (!(v.name || v.subject)) v = await conn.groupMetadata(jid) || {};
        resolve(v.name || v.subject || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international'));
      });
    } else {
      v = jid === '0@s.whatsapp.net' ? {
        jid,
        vname: 'WhatsApp',
      } : areJidsSameUser(jid, conn.user.id) ?
        conn.user :
        (conn.chats[jid] || {});
    }
    return (withoutContact ? '' : v.name) || v.subject || v.vname || v.notify || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international');
  },

  loadMessage(conn, messageID) {
    return Object.entries(conn.chats)
      .filter(([_, {messages}]) => typeof messages === 'object')
      .find(([_, {messages}]) => Object.entries(messages)
        .find(([k, v]) => (k === messageID || v.key?.id === messageID)))
      ?.[1].messages?.[messageID];
  }
};