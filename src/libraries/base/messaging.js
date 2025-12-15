import { toAudio } from '../converter.js';
import PhoneNumber from 'awesome-phonenumber';
import {downloadContentFromMessage} from '@whiskeysockets/baileys';
import fs from 'fs';

export const messagingUtils = {
  async sendFile(conn, jid, path, filename = '', caption = '', quoted, ptt = false, options = {}) {
    const type = await conn.getFile(path, true);
    let {res, data: file, filename: pathFile} = type;
    if (res && res.status !== 200 || file.length <= 65536) {
      try {
        throw {json: JSON.parse(file.toString())};
      } catch (e) {
        if (e.json) throw e.json;
      }
    }

    const opt = {};
    if (quoted) opt.quoted = quoted;
    if (!type) options.asDocument = true;
    let mtype = ''; let mimetype = options.mimetype || type.mime; let convert;
    if (/webp/.test(type.mime) || (/image/.test(type.mime) && options.asSticker)) mtype = 'sticker';
    else if (/image/.test(type.mime) || (/webp/.test(type.mime) && options.asImage)) mtype = 'image';
    else if (/video/.test(type.mime)) mtype = 'video';
    else if (/audio/.test(type.mime)) {
      (
        convert = await toAudio(file, type.ext),
        file = convert.data,
        pathFile = convert.filename,
        mtype = 'audio',
        mimetype = options.mimetype || 'audio/mpeg; codecs=opus'
      );
    } else mtype = 'document';
    if (options.asDocument) mtype = 'document';

    delete options.asSticker;
    delete options.asLocation;
    delete options.asVideo;
    delete options.asDocument;
    delete options.asImage;

    const message = {
      ...options,
      caption,
      ptt,
      [mtype]: {url: pathFile},
      mimetype,
      fileName: filename || pathFile.split('/').pop(),
    };
   
    let m;
    try {
      m = await conn.sendMessage(jid, message, {...opt, ...options});
    } catch (e) {
      console.error(e);
      m = null;
    } finally {
      if (!m) m = await conn.sendMessage(jid, {...message, [mtype]: file}, {...opt, ...options});
      file = null;
      return m;
    }
  },

  async sendContact(conn, jid, data, quoted, options) {
    if (!Array.isArray(data[0]) && typeof data[0] === 'string') data = [data];
    const contacts = [];
    for (let [number, name] of data) {
      number = number.replace(/[^0-9]/g, '');
      const njid = number + '@s.whatsapp.net';
      const biz = await conn.getBusinessProfile(njid).catch((_) => null) || {};
      const vcard = `
BEGIN:VCARD
VERSION:3.0
N:;${name.replace(/\n/g, '\\n')};;;
FN:${name.replace(/\n/g, '\\n')}
TEL;type=CELL;type=VOICE;waid=${number}:${PhoneNumber('+' + number).getNumber('international')}${biz.description ? `
X-WA-BIZ-NAME:${(conn.chats[njid]?.vname || conn.getName(njid) || name).replace(/\n/, '\\n')}
X-WA-BIZ-DESCRIPTION:${biz.description.replace(/\n/g, '\\n')}
`.trim() : ''}
END:VCARD
      `.trim();
      contacts.push({vcard, displayName: name});
    }
    return await conn.sendMessage(jid, {
      ...options,
      contacts: {
        ...options,
        displayName: (contacts.length >= 2 ? `${contacts.length} kontak` : contacts[0].displayName) || null,
        contacts,
      },
    }, {quoted, ...options});
  },

  reply(conn, jid, text = '', quoted, options) {
    return Buffer.isBuffer(text) ? conn.sendFile(jid, text, 'file', '', quoted, false, options) : conn.sendMessage(jid, {...options, text}, {quoted, ...options});
  },

  async sendPoll(conn, jid, name = '', optiPoll, options) {
    if (!Array.isArray(optiPoll[0]) && typeof optiPoll[0] === 'string') optiPoll = [optiPoll];
    if (!options) options = {};
    const pollMessage = {
      name: name,
      options: optiPoll.map((btn) => ({
        optionName: !nullish(btn[0]) && btn[0] || '',
      })),
      selectableOptionsCount: 1,
    };
    return conn.relayMessage(jid, {pollCreationMessage: pollMessage}, {...options});
  },

  async downloadM(conn, m, type, saveToFile) {
    let filename;
    if (!m || !(m.url || m.directPath)) return Buffer.alloc(0);
    const stream = await downloadContentFromMessage(m, type);
    let buffer = Buffer.from([]);
    for await (const chunk of stream) {
      buffer = Buffer.concat([buffer, chunk]);
    }
    if (saveToFile) ({filename} = await conn.getFile(buffer, true));
    return saveToFile && fs.existsSync(filename) ? filename : buffer;
  },

  parseMention(text = '') {
    return [...text.matchAll(/@([0-9]{5,20})/g)].map((v) => {
      const num = v[1].replace(/[^0-9]/g, '');
      return num + '@s.whatsapp.net';
    });
  }
};

function nullish(args) {
  return !(args !== null && args !== undefined);
}
