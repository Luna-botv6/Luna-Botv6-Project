import fetch from 'node-fetch';
import {
  prepareWAMessageMedia,
  generateWAMessageFromContent,
  proto,
  WA_DEFAULT_EPHEMERAL
} from '@whiskeysockets/baileys';
import {randomBytes} from 'crypto';

async function _prepareMedia(conn, buffer, options = {}) {
  if (!buffer) return { img: null, video: null };
  let img = null, video = null;
  try {
    if (/^https?:\/\//i.test(buffer)) {
      const response = await fetch(buffer, { signal: AbortSignal.timeout(15000) });
      const contentType = response.headers.get('content-type') || '';
      if (/^image\//i.test(contentType)) {
        img = await prepareWAMessageMedia({ image: { url: buffer } }, { upload: conn.waUploadToServer, ...options });
      } else if (/^video\//i.test(contentType)) {
        video = await prepareWAMessageMedia({ video: { url: buffer } }, { upload: conn.waUploadToServer, ...options });
      }
    } else {
      const type = await conn.getFile(buffer);
      if (/^image\//i.test(type.mime)) {
        img = await prepareWAMessageMedia({ image: type.data }, { upload: conn.waUploadToServer, ...options });
      } else if (/^video\//i.test(type.mime)) {
        video = await prepareWAMessageMedia({ video: type.data }, { upload: conn.waUploadToServer, ...options });
      }
    }
  } catch (e) {
    console.error('[interactive] _prepareMedia error:', e.message);
  }
  return { img, video };
}

function _buildContextInfo(conn, text, options) {
  return Object.assign(
    {
      mentions: typeof text === 'string' ? conn.parseMention(text || '@0') : [],
      contextInfo: {
        mentionedJid: typeof text === 'string' ? conn.parseMention(text || '@0') : [],
      }
    },
    {
      ...(options || {}),
      ...(conn.temareply?.contextInfo && {
        contextInfo: {
          ...(options?.contextInfo || {}),
          ...conn.temareply?.contextInfo,
          externalAdReply: {
            ...(options?.contextInfo?.externalAdReply || {}),
            ...conn.temareply?.contextInfo?.externalAdReply,
          },
        },
      })
    }
  );
}

function _wrapInteractive(interactiveMessage) {
  return proto.Message.fromObject({
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2
        },
        interactiveMessage
      }
    }
  });
}

export const interactiveUtils = {
  async sendButtonMessages(conn, jid, messages, quoted, options) {
    messages.length > 1
      ? await this.sendCarousel(conn, jid, messages, quoted, options)
      : await this.sendNCarousel(conn, jid, ...messages[0], quoted, options);
  },

  async sendNCarousel(conn, jid, text = '', footer = '', buffer, buttons, copy, urls, list, quoted, options) {
    const { img, video } = await _prepareMedia(conn, buffer, options);

    const dynamicButtons = buttons.map(btn => ({
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({ display_text: btn[0], id: btn[1] }),
    }));

    if (copy && (typeof copy === 'string' || typeof copy === 'number')) {
      dynamicButtons.push({
        name: 'cta_copy',
        buttonParamsJson: JSON.stringify({ display_text: 'Copy', copy_code: copy })
      });
    }

    urls?.forEach(url => {
      dynamicButtons.push({
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({ display_text: url[0], url: url[1], merchant_url: url[1] })
      });
    });

    list?.forEach(lister => {
      dynamicButtons.push({
        name: 'single_select',
        buttonParamsJson: JSON.stringify({ title: lister[0], sections: lister[1] })
      });
    });

    const interactiveMessage = {
      body: { text: text || '' },
      footer: { text: footer || global.wm },
      header: {
        hasMediaAttachment: !!(img?.imageMessage || video?.videoMessage),
        imageMessage: img?.imageMessage || null,
        videoMessage: video?.videoMessage || null
      },
      nativeFlowMessage: {
        buttons: dynamicButtons.filter(Boolean),
        messageParamsJson: ''
      },
      ..._buildContextInfo(conn, text, options)
    };

    const messageContent = _wrapInteractive(interactiveMessage);
    const msgs = await generateWAMessageFromContent(jid, messageContent, {
      userJid: conn.user.jid,
      quoted,
      upload: conn.waUploadToServer,
      ephemeralExpiration: WA_DEFAULT_EPHEMERAL
    });
    await conn.relayMessage(jid, msgs.message, { messageId: msgs.key.id });
  },

  async sendCarousel(conn, jid, text = '', footer = '', text2 = '', messages, quoted, options) {
    if (messages.length > 1) {
      const cards = await Promise.all(messages.map(async ([cardText = '', cardFooter = '', buffer, buttons, copy, urls, list]) => {
        const { img, video } = await _prepareMedia(conn, buffer, options);

        const dynamicButtons = buttons.map(btn => ({
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({ display_text: btn[0], id: btn[1] }),
        }));

        const copyArr = Array.isArray(copy) ? copy : [copy];
        copyArr.forEach(c => {
          if (c) dynamicButtons.push({
            name: 'cta_copy',
            buttonParamsJson: JSON.stringify({ display_text: 'Copy', copy_code: Array.isArray(c) ? c[0] : c })
          });
        });

        urls?.forEach(url => {
          dynamicButtons.push({
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({ display_text: url[0], url: url[1], merchant_url: url[1] })
          });
        });

        list?.forEach(lister => {
          dynamicButtons.push({
            name: 'single_select',
            buttonParamsJson: JSON.stringify({ title: lister[0], sections: lister[1] })
          });
        });

        return {
          body: proto.Message.InteractiveMessage.Body.fromObject({ text: cardText || '' }),
          footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: cardFooter || global.wm }),
          header: proto.Message.InteractiveMessage.Header.fromObject({
            title: text2,
            subtitle: cardText || '',
            hasMediaAttachment: !!(img?.imageMessage || video?.videoMessage),
            imageMessage: img?.imageMessage || null,
            videoMessage: video?.videoMessage || null
          }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
            buttons: dynamicButtons.filter(Boolean),
            messageParamsJson: ''
          }),
          ..._buildContextInfo(conn, cardText, options)
        };
      }));

      const interactiveMessage = proto.Message.InteractiveMessage.create({
        body: proto.Message.InteractiveMessage.Body.fromObject({ text: text || '' }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({ text: footer || global.wm }),
        header: proto.Message.InteractiveMessage.Header.fromObject({
          title: text || '',
          subtitle: text || '',
          hasMediaAttachment: false
        }),
        carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({ cards }),
        ..._buildContextInfo(conn, text, options)
      });

      const messageContent = _wrapInteractive(interactiveMessage);
      const msgs = await generateWAMessageFromContent(jid, messageContent, {
        userJid: conn.user.jid,
        quoted,
        upload: conn.waUploadToServer,
        ephemeralExpiration: WA_DEFAULT_EPHEMERAL
      });
      await conn.relayMessage(jid, msgs.message, { messageId: msgs.key.id });
    } else {
      await this.sendNCarousel(conn, jid, ...messages[0], quoted, options);
    }
  },

  async sendButton(conn, jid, text = '', footer = '', buffer, buttons, copy, urls, quoted, options) {
    const { img, video } = await _prepareMedia(conn, buffer, options);

    const dynamicButtons = buttons.map(btn => ({
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({ display_text: btn[0], id: btn[1] }),
    }));

    if (copy && (typeof copy === 'string' || typeof copy === 'number')) {
      dynamicButtons.push({
        name: 'cta_copy',
        buttonParamsJson: JSON.stringify({ display_text: 'Copy', copy_code: copy })
      });
    }

    if (urls && Array.isArray(urls)) {
      urls.forEach(url => {
        dynamicButtons.push({
          name: 'cta_url',
          buttonParamsJson: JSON.stringify({ display_text: url[0], url: url[1], merchant_url: url[1] })
        });
      });
    }

    const interactiveMessage = {
      body: { text },
      footer: { text: footer },
      header: {
        hasMediaAttachment: !!(img?.imageMessage || video?.videoMessage),
        imageMessage: img?.imageMessage || null,
        videoMessage: video?.videoMessage || null
      },
      nativeFlowMessage: {
        buttons: dynamicButtons,
        messageParamsJson: ''
      }
    };

    const msgL = generateWAMessageFromContent(jid, _wrapInteractive(interactiveMessage), {
      userJid: conn.user.jid,
      quoted
    });
    await conn.relayMessage(jid, msgL.message, { messageId: msgL.key.id, ...options });
  },

  async sendList(conn, jid, title, text, buttonText, listSections, quoted, options = {}) {
    const sections = [...listSections];
    const message = {
      interactiveMessage: {
        header: { title },
        body: { text },
        nativeFlowMessage: {
          buttons: [{
            name: 'single_select',
            buttonParamsJson: JSON.stringify({ title: buttonText, sections })
          }],
          messageParamsJson: ''
        }
      }
    };
    const msgs = generateWAMessageFromContent(jid, { viewOnceMessage: { message } }, {
      userJid: conn.user.jid,
      quoted
    });
    await conn.relayMessage(jid, msgs.message, { messageId: msgs.key.id, ...options });
  },

  async sendEvent(conn, jid, text, des, loc, link) {
    const msg = generateWAMessageFromContent(jid, {
      messageContextInfo: { messageSecret: randomBytes(32) },
      eventMessage: {
        isCanceled: false,
        name: text,
        description: des,
        location: { degreesLatitude: 0, degreesLongitude: 0, name: loc },
        joinLink: link,
        startTime: Math.floor(Date.now() / 1000)
      }
    }, { userJid: conn.user.jid });
    await conn.relayMessage(jid, msg.message, { messageId: msg.key.id });
  },

  async sendNyanCat(conn, jid, text = '', buffer, title, body, url, quoted, options) {
    let thumbnail = null;
    if (buffer) {
      try {
        const type = await conn.getFile(buffer);
        thumbnail = type.data;
      } catch {
        thumbnail = null;
      }
    }
    const prep = generateWAMessageFromContent(jid, {
      extendedTextMessage: {
        text,
        contextInfo: {
          externalAdReply: { title, body, thumbnail, sourceUrl: url },
          mentionedJid: conn.parseMention(text)
        }
      }
    }, { userJid: conn.user.jid, quoted });
    return conn.relayMessage(jid, prep.message, { messageId: prep.key.id });
  },

  async sendPayment(conn, jid, amount, text, quoted, options) {
    await conn.relayMessage(jid, {
      requestPaymentMessage: {
        currencyCodeIso4217: 'PEN',
        amount1000: amount,
        requestFrom: null,
        noteMessage: {
          extendedTextMessage: {
            text,
            contextInfo: {
              externalAdReply: { showAdAttribution: true },
              mentionedJid: conn.parseMention(text)
            }
          }
        }
      }
    }, {});
  },

  async sendLocation(conn, jid, lat, lon, name = '', address = '', quoted, options = {}) {
    const msgs = await conn.sendMessage(jid, {
      location: {
        degreesLatitude: lat,
        degreesLongitude: lon,
        name,
        address
      },
      ...options
    }, { quoted, ...options });
    return msgs;
  },

  async sendContact(conn, jid, contacts, quoted, options = {}) {
    return conn.sendContact(jid, contacts, quoted, options);
  },

  async sendReaction(conn, jid, key, reaction) {
    return conn.sendMessage(jid, { react: { text: reaction, key } });
  },

  async sendGif(conn, jid, buffer, caption = '', quoted, options = {}) {
    const { img, video } = await _prepareMedia(conn, buffer, options);
    if (!video) throw new Error('[sendGif] El buffer no es un video/gif válido');
    return conn.sendMessage(jid, {
      video: video.videoMessage,
      caption,
      gifPlayback: true,
      ...options
    }, { quoted, ...options });
  },

  async sendMentionAll(conn, jid, text, participants, quoted, options = {}) {
    const mentions = participants.map(p => p.id || p);
    return conn.sendMessage(jid, {
      text,
      mentions,
      mentionAll: true,
      ...options
    }, { quoted, ...options });
  },

  async sendSpoiler(conn, jid, content, quoted, options = {}) {
    return conn.sendMessage(jid, {
      ...content,
      spoiler: true,
      ...options
    }, { quoted, ...options });
  },

  async sendEphemeral(conn, jid, content, expirationSeconds = 86400, quoted, options = {}) {
    return conn.sendMessage(jid, {
      ...content,
      ephemeral: true,
      ...options
    }, {
      quoted,
      ephemeralExpiration: expirationSeconds,
      ...options
    });
  },

  async sendAlbum(conn, jid, mediaArray, quoted, options = {}) {
    const album = await Promise.all(mediaArray.map(async ({ buffer, caption = '', type = 'image' }) => {
      const { img, video } = await _prepareMedia(conn, buffer, options);
      if (type === 'video' && video) return { video: video.videoMessage, caption };
      if (img) return { image: img.imageMessage, caption };
      return null;
    }));
    return conn.sendMessage(jid, {
      album: album.filter(Boolean),
      ...options
    }, { quoted, ...options });
  },

  async sendAiMessage(conn, jid, text, quoted, options = {}) {
    return conn.sendMessage(jid, {
      text,
      ai: true,
      ...options
    }, { quoted, ...options });
  },
};