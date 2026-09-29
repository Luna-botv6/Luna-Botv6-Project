import { toAudio } from '../converter.js';
import PhoneNumber from 'awesome-phonenumber';
import { downloadContentFromMessage, generateMessageID } from '@whiskeysockets/baileys';
import fs from 'fs';

const is403 = (e) => !!(e && (e.output?.statusCode === 403 || e.statusCode === 403));

export const messagingUtils = {
  async sendFile(conn, jid, path, filename = '', caption = '', quoted, ptt = false, options = {}) {
    const type = await conn.getFile(path, true);
    let {res, data: file, filename: pathFile} = type;
    if (res && !res.ok) {
      try {
        throw {json: JSON.parse(file.toString())};
      } catch (e) {
        if (e.json) throw e.json;
      }
    }

    const opt = {};
    if (quoted) opt.quoted = quoted;
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
        mimetype = options.mimetype || 'audio/ogg; codecs=opus'
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

    let m; let aborted = false;
    try {
      m = await conn.sendMessage(jid, message, {...opt, ...options});
    } catch (e) {
      if (is403(e)) { file = null; aborted = true; return null; }
      m = null;
    } finally {
      if (!m && !aborted) {
        try {
          m = await conn.sendMessage(jid, {...message, [mtype]: file}, {...opt, ...options});
        } catch (e2) {
          if (is403(e2)) file = null;
          m = null;
        }
      }
      file = null;
    }
    return m;
  },

  async sendContact(conn, jid, data, quoted, options) {
    let items = data;
    if (Array.isArray(items?.[0])) {
      items = items.map((pair) => {
        if (typeof pair[0] === 'object' && pair[0] !== null) return [pair[0].number ?? pair[0].id ?? '', pair[1] ?? pair[0].name ?? ''];
        return [pair[0], pair[1]];
      });
    } else if (typeof items?.[0] === 'string') {
      items = [items];
    } else if (items?.[0] && typeof items[0] === 'object') {
      items = items.map((x) => [x.number ?? x.id ?? '', x.name ?? x.displayName ?? '']);
    }
    const contacts = [];
    if (!global._bizProfileCache) global._bizProfileCache = new Map();
    for (let [number, name] of items) {
      number = String(number || '').replace(/[^0-9]/g, '');
      const njid = number + '@s.whatsapp.net';
      const _bizCached = global._bizProfileCache.get(njid);
      const biz = _bizCached !== undefined ? _bizCached : await conn.getBusinessProfile(njid).catch((_) => null) || {};
      if (_bizCached === undefined) global._bizProfileCache.set(njid, biz);
      const intl = PhoneNumber('+' + number).getNumber('international') || number;
      const vcard = `
BEGIN:VCARD
VERSION:3.0
N:;${name.replace(/\n/g, '\\n')};;;
FN:${name.replace(/\n/g, '\\n')}
TEL;type=CELL;type=VOICE;waid=${number}:${intl}${biz.description ? `
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
        displayName: (contacts.length >= 2 ? `${contacts.length} kontak` : (contacts[0]?.displayName || '')) || null,
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
    const _pollId = generateMessageID();
    return conn.relayMessage(jid, {pollCreationMessage: pollMessage}, {messageId: _pollId, ...options});
  },

  async downloadM(conn, m, type, saveToFile) {
    let filename;
    if (!m || !(m.url || m.directPath)) return Buffer.alloc(0);
    const stream = await downloadContentFromMessage(m, type);
    const _chunks = [];
    for await (const chunk of stream) {
      _chunks.push(chunk);
    }
    const buffer = Buffer.concat(_chunks);
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