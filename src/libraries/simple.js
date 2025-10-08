import store from './store.js';
import {coreUtils} from './base/core.js';
import {messagingUtils} from './base/messaging.js';
import {interactiveUtils} from './base/interactive.js';
import {advancedUtils} from './base/advanced.js';
import {smsg, serialize, protoType, pushMessage, logic} from './base/serialization.js';

const {
  default: _makeWaSocket,
  makeWALegacySocket,
  proto,
  downloadContentFromMessage,
  jidDecode,
  areJidsSameUser,
  generateWAMessage,
  generateForwardMessageContent,
  generateWAMessageFromContent,
  WAMessageStubType,
  extractMessageContent,
  makeInMemoryStore,
  getAggregateVotesInPollMessage, 
  prepareWAMessageMedia,
  WA_DEFAULT_EPHEMERAL
} = (await import("@whiskeysockets/baileys")).default

export function makeWASocket(connectionOptions, options = {}) {
  const conn = (global.opts['legacy'] ? makeWALegacySocket : _makeWaSocket)(connectionOptions);

  const sock = Object.defineProperties(conn, {
    chats: {
      value: {...(options.chats || {})},
      writable: true,
    },
    
    // Core utilities
    decodeJid: {
      value(jid) {
        return coreUtils.decodeJid.call(this, jid);
      },
    },
    logger: {
      get() {
        return coreUtils.logger;
      },
      enumerable: true,
    },
    getFile: {
      async value(PATH, saveToFile = false) {
        return await coreUtils.getFile(PATH, saveToFile);
      },
      enumerable: true,
    },
    waitEvent: {
      value(eventName, is = () => true, maxTries = 25) {
        return coreUtils.waitEvent(conn, eventName, is, maxTries);
      },
    },

    // Messaging utilities
    sendFile: {
      async value(jid, path, filename = '', caption = '', quoted, ptt = false, options = {}) {
        return await messagingUtils.sendFile(conn, jid, path, filename, caption, quoted, ptt, options);
      },
      enumerable: true,
    },
    sendContact: {
      async value(jid, data, quoted, options) {
        return await messagingUtils.sendContact(conn, jid, data, quoted, options);
      },
      enumerable: true,
    },
    reply: {
      value(jid, text = '', quoted, options) {
        return messagingUtils.reply(conn, jid, text, quoted, options);
      },
    },
    sendPoll: {
      async value(jid, name = '', optiPoll, options) {
        return await messagingUtils.sendPoll(conn, jid, name, optiPoll, options);
      },
    },
    downloadM: {
      async value(m, type, saveToFile) {
        return await messagingUtils.downloadM(conn, m, type, saveToFile);
      },
      enumerable: true,
    },
    parseMention: {
      value(text = '') {
        return messagingUtils.parseMention(text);
      },
      enumerable: true,
    },

    // Interactive utilities
    sendButtonMessages: {
      async value(jid, messages, quoted, options) {
        return await interactiveUtils.sendButtonMessages(conn, jid, messages, quoted, options);
      }
    },
    sendNCarousel: {
      async value(jid, text = '', footer = '', buffer, buttons, copy, urls, list, quoted, options) {
        return await interactiveUtils.sendNCarousel(conn, jid, text, footer, buffer, buttons, copy, urls, list, quoted, options);
      }
    },
    sendCarousel: {
      async value(jid, text = '', footer = '', text2 = '', messages, quoted, options) {
        return await interactiveUtils.sendCarousel(conn, jid, text, footer, text2, messages, quoted, options);
      }
    },
    sendButton: {
      async value(jid, text = '', footer = '', buffer, buttons, copy, urls, quoted, options) {
        return await interactiveUtils.sendButton(conn, jid, text, footer, buffer, buttons, copy, urls, quoted, options);
      }
    },
    sendList: {
      async value(jid, title, text, buttonText, listSections, quoted, options = {}) {
        return await interactiveUtils.sendList(conn, jid, title, text, buttonText, listSections, quoted, options);
      }
    },
    sendEvent: {
      async value(jid, text, des, loc, link) {
        return await interactiveUtils.sendEvent(conn, jid, text, des, loc, link);
      },
      enumerable: true
    },
    sendNyanCat: {
      async value(jid, text = '', buffer, title, body, url, quoted, options) {
        return await interactiveUtils.sendNyanCat(conn, jid, text, buffer, title, body, url, quoted, options);
      },
    },
    sendPayment: {
      async value(jid, amount, text, quoted, options) {
        return await interactiveUtils.sendPayment(conn, jid, amount, text, quoted, options);
      },
    },

    // Advanced utilities
    relayWAMessage: {
      async value(pesanfull) {
        return await advancedUtils.relayWAMessage(conn, pesanfull);
      },
    },
    sendHydrated: {
      async value(jid, text = '', footer = '', buffer, url, urlText, call, callText, buttons, quoted, options) {
        return await advancedUtils.sendHydrated(conn, jid, text, footer, buffer, url, urlText, call, callText, buttons, quoted, options);
      },
      enumerable: true,
    },
    sendHydrated2: {
      async value(jid, text = '', footer = '', buffer, url, urlText, url2, urlText2, buttons, quoted, options) {
        return await advancedUtils.sendHydrated2(conn, jid, text, footer, buffer, url, urlText, url2, urlText2, buttons, quoted, options);
      },
      enumerable: true,
    },
    cMod: {
      value(jid, message, text = '', sender = conn.user.jid, options = {}) {
        return advancedUtils.cMod(conn, jid, message, text, sender, options);
      },
      enumerable: true,
    },
    copyNForward: {
      async value(jid, message, forwardingScore = true, options = {}) {
        return await advancedUtils.copyNForward(conn, jid, message, forwardingScore, options);
      },
      enumerable: true,
    },
    fakeReply: {
      value(jid, text = '', fakeJid = this.user.jid, fakeText = '', fakeGroupJid, options) {
        return advancedUtils.fakeReply(conn, jid, text, fakeJid, fakeText, fakeGroupJid, options);
      },
    },
    sendGroupV4Invite: {
      async value(jid, participant, inviteCode, inviteExpiration, groupName = 'unknown subject', caption = 'Invitation to join my WhatsApp group', jpegThumbnail, options = {}) {
        return await advancedUtils.sendGroupV4Invite(conn, jid, participant, inviteCode, inviteExpiration, groupName, caption, jpegThumbnail, options);
      },
      enumerable: true,
    },
    processMessageStubType: {
      async value(m) {
        return await advancedUtils.processMessageStubType(conn, m);
      },
    },
    insertAllGroup: {
      async value() {
        return await advancedUtils.insertAllGroup(conn);
      },
    },
    getName: {
      value(jid = '', withoutContact = false) {
        return advancedUtils.getName(conn, jid, withoutContact);
      },
      enumerable: true,
    },
    loadMessage: {
      value(messageID) {
        return advancedUtils.loadMessage(conn, messageID);
      },
      enumerable: true,
    },
    pushMessage: {
      async value(m) {
        return await pushMessage(conn, m);
      },
    },
    serializeM: {
      value(m) {
        return smsg(conn, m);
      },
    },
    ...(typeof conn.chatRead !== 'function' ? {
      chatRead: {
        value(jid, participant = conn.user.jid, messageID) {
          return conn.sendReadReceipt(jid, participant, [messageID]);
        },
        enumerable: true,
      },
    } : {}),
    ...(typeof conn.setStatus !== 'function' ? {
      setStatus: {
        value(status) {
          return conn.query({
            tag: 'iq',
            attrs: {
              to: 'S_WHATSAPP_NET',
              type: 'set',
              xmlns: 'status',
            },
            content: [
              {
                tag: 'status',
                attrs: {},
                content: Buffer.from(status, 'utf-8'),
              },
            ],
          });
        },
        enumerable: true,
      },
    } : {}),
  });

  if (sock.user?.id) sock.user.jid = sock.decodeJid(sock.user.id);
  store.bind(sock);
  return sock;
}

// Export helper functions
export {smsg, serialize, protoType, logic};