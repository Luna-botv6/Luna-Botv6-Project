import fetch from 'node-fetch';
import {
  prepareWAMessageMedia,
  generateWAMessageFromContent,
  proto,
  WA_DEFAULT_EPHEMERAL
} from '@whiskeysockets/baileys';
import {randomBytes} from 'crypto';

export const interactiveUtils = {
  async sendButtonMessages(conn, jid, messages, quoted, options) {
    messages.length > 1 ? await this.sendCarousel(conn, jid, messages, quoted, options) : await this.sendNCarousel(
      conn, jid, ...messages[0], quoted, options);
  },

  async sendNCarousel(conn, jid, text = '', footer = '', buffer, buttons, copy, urls, list, quoted, options) {
    let img, video;
    if (buffer) {
      if (/^https?:\/\//i.test(buffer)) {
        try {
          const response = await fetch(buffer);
          const contentType = response.headers.get('content-type');
          if (/^image\//i.test(contentType)) {
            img = await prepareWAMessageMedia({
              image: {url: buffer}
            }, {
              upload: conn.waUploadToServer,
              ...options
            });
          } else if (/^video\//i.test(contentType)) {
            video = await prepareWAMessageMedia({
              video: {url: buffer}
            }, {
              upload: conn.waUploadToServer,
              ...options
            });
          } else {
            console.error("Incompatible MIME type:", contentType);
          }
        } catch (error) {
          console.error("Failed to get MIME type:", error);
        }
      } else {
        try {
          const type = await conn.getFile(buffer);
          if (/^image\//i.test(type.mime)) {
            img = await prepareWAMessageMedia({
              image: (/^https?:\/\//i.test(buffer)) ? {url: buffer} : (type && type?.data)
            }, {
              upload: conn.waUploadToServer,
              ...options
            });
          } else if (/^video\//i.test(type.mime)) {
            video = await prepareWAMessageMedia({
              video: (/^https?:\/\//i.test(buffer)) ? {url: buffer} : (type && type?.data)
            }, {
              upload: conn.waUploadToServer,
              ...options
            });
          }
        } catch (error) {
          console.error("Failed to get file type:", error);
        }
      }
    }
    const dynamicButtons = buttons.map(btn => ({
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: btn[0],
        id: btn[1]
      }),
    }));
    dynamicButtons.push(
      (copy && (typeof copy === 'string' || typeof copy === 'number')) ? {
        name: 'cta_copy',
        buttonParamsJson: JSON.stringify({
          display_text: 'Copy',
          copy_code: copy
        })
      } : null);
    urls?.forEach(url => {
      dynamicButtons.push({
        name: 'cta_url',
        buttonParamsJson: JSON.stringify({
          display_text: url[0],
          url: url[1],
          merchant_url: url[1]
        })
      });
    });
    list?.forEach(lister => {
      dynamicButtons.push({
        name: 'single_select',
        buttonParamsJson: JSON.stringify({
          title: lister[0],
          sections: lister[1]
        })
      });
    })
    const interactiveMessage = {
      body: {text: text || ''},
      footer: {text: footer || global.wm},
      header: {
        hasMediaAttachment: img?.imageMessage || video?.videoMessage ? true : false,
        imageMessage: img?.imageMessage || null,
        videoMessage: video?.videoMessage || null
      },
      nativeFlowMessage: {
        buttons: dynamicButtons.filter(Boolean),
        messageParamsJson: ''
      },
      ...Object.assign({
        mentions: typeof text === 'string' ? conn.parseMention(text || '@0') : [],
        contextInfo: {
          mentionedJid: typeof text === 'string' ? conn.parseMention(text || '@0') : [],
        }
      }, {
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
      })
    };
    const messageContent = proto.Message.fromObject({
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
    const msgs = await generateWAMessageFromContent(jid, messageContent, {
      userJid: conn.user.jid,
      quoted: quoted,
      upload: conn.waUploadToServer,
      ephemeralExpiration: WA_DEFAULT_EPHEMERAL
    });
    await conn.relayMessage(jid, msgs.message, {
      messageId: msgs.key.id
    });
  },

  async sendCarousel(conn, jid, text = '', footer = '', text2 = '', messages, quoted, options) {
    if (messages.length > 1) {
      const cards = await Promise.all(messages.map(async ([text = '', footer = '', buffer, buttons, copy, urls, list]) => {
        let img, video;
        if (/^https?:\/\//i.test(buffer)) {
          try {
            const response = await fetch(buffer);
            const contentType = response.headers.get('content-type');
            if (/^image\//i.test(contentType)) {
              img = await prepareWAMessageMedia({
                image: {url: buffer}
              }, {
                upload: conn.waUploadToServer,
                ...options
              });
            } else if (/^video\//i.test(contentType)) {
              video = await prepareWAMessageMedia({
                video: {url: buffer}
              }, {
                upload: conn.waUploadToServer,
                ...options
              });
            } else {
              console.error("Incompatible MIME types:", contentType);
            }
          } catch (error) {
            console.error("Failed to get MIME type:", error);
          }
        } else {
          try {
            const type = await conn.getFile(buffer);
            if (/^image\//i.test(type.mime)) {
              img = await prepareWAMessageMedia({
                image: (/^https?:\/\//i.test(buffer)) ? {url: buffer} : (type && type?.data)
              }, {
                upload: conn.waUploadToServer,
                ...options
              });
            } else if (/^video\//i.test(type.mime)) {
              video = await prepareWAMessageMedia({
                video: (/^https?:\/\//i.test(buffer)) ? {url: buffer} : (type && type?.data)
              }, {
                upload: conn.waUploadToServer,
                ...options
              });
            }
          } catch (error) {
            console.error("Failed to get file type:", error);
          }
        }
        const dynamicButtons = buttons.map(btn => ({
          name: 'quick_reply',
          buttonParamsJson: JSON.stringify({
            display_text: btn[0],
            id: btn[1]
          }),
        }));
       
        copy = Array.isArray(copy) ? copy : [copy]
        copy.map(copy => {
          dynamicButtons.push({
            name: 'cta_copy',
            buttonParamsJson: JSON.stringify({
              display_text: 'Copy',
              copy_code: copy[0]
            })
          });
        });
        urls?.forEach(url => {
          dynamicButtons.push({
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
              display_text: url[0],
              url: url[1],
              merchant_url: url[1]
            })
          });
        });

        list?.forEach(lister => {
          dynamicButtons.push({
            name: 'single_select',
            buttonParamsJson: JSON.stringify({
              title: lister[0],
              sections: lister[1]
            })
          });
        })

        return {
          body: proto.Message.InteractiveMessage.Body.fromObject({
            text: text || ''
          }),
          footer: proto.Message.InteractiveMessage.Footer.fromObject({
            text: footer || global.wm
          }),
          header: proto.Message.InteractiveMessage.Header.fromObject({
            title: text2,
            subtitle: text || '',
            hasMediaAttachment: img?.imageMessage || video?.videoMessage ? true : false,
            imageMessage: img?.imageMessage || null,
            videoMessage: video?.videoMessage || null
          }),
          nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.fromObject({
            buttons: dynamicButtons.filter(Boolean),
            messageParamsJson: ''
          }),
          ...Object.assign({
            mentions: typeof text === 'string' ? conn.parseMention(text || '@0') : [],
            contextInfo: {
              mentionedJid: typeof text === 'string' ? conn.parseMention(text || '@0') : [],
            }
          }, {
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
          })
        };
      }));
      const interactiveMessage = proto.Message.InteractiveMessage.create({
        body: proto.Message.InteractiveMessage.Body.fromObject({
          text: text || ''
        }),
        footer: proto.Message.InteractiveMessage.Footer.fromObject({
          text: footer || global.wm
        }),
        header: proto.Message.InteractiveMessage.Header.fromObject({
          title: text || '',
          subtitle: text || '',
          hasMediaAttachment: false
        }),
        carouselMessage: proto.Message.InteractiveMessage.CarouselMessage.fromObject({
          cards,
        }),
        ...Object.assign({
          mentions: typeof text === 'string' ? conn.parseMention(text || '@0') : [],
          contextInfo: {
            mentionedJid: typeof text === 'string' ? conn.parseMention(text || '@0') : [],
          }
        }, {
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
        })
      });
      const messageContent = proto.Message.fromObject({
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
      const msgs = await generateWAMessageFromContent(jid, messageContent, {
        userJid: conn.user.jid,
        quoted: quoted,
        upload: conn.waUploadToServer,
        ephemeralExpiration: WA_DEFAULT_EPHEMERAL
      });
      await conn.relayMessage(jid, msgs.message, {
        messageId: msgs.key.id
      });
    } else {
      await this.sendNCarousel(conn, jid, ...messages[0], quoted, options);
    }
  },

  async sendButton(conn, jid, text = '', footer = '', buffer, buttons, copy, urls, quoted, options) {
    let img, video;
    if (/^https?:\/\//i.test(buffer)) {
      try {
        const response = await fetch(buffer);
        const contentType = response.headers.get('content-type');
        if (/^image\//i.test(contentType)) {
          img = await prepareWAMessageMedia({image: {url: buffer}}, {upload: conn.waUploadToServer});
        } else if (/^video\//i.test(contentType)) {
          video = await prepareWAMessageMedia({video: {url: buffer}}, {upload: conn.waUploadToServer});
        } else {
          console.error("Tipo MIME no compatible:", contentType);
        }
      } catch (error) {
        console.error("Error al obtener el tipo MIME:", error);
      }
    } else {
      try {
        const type = await conn.getFile(buffer);
        if (/^image\//i.test(type.mime)) {
          img = await prepareWAMessageMedia({image: {url: buffer}}, {upload: conn.waUploadToServer});
        } else if (/^video\//i.test(type.mime)) {
          video = await prepareWAMessageMedia({video: {url: buffer}}, {upload: conn.waUploadToServer});
        }
      } catch (error) {
        console.error("Error al obtener el tipo de archivo:", error);
      }
    }

    const dynamicButtons = buttons.map(btn => ({
      name: 'quick_reply',
      buttonParamsJson: JSON.stringify({
        display_text: btn[0],
        id: btn[1]
      }),
    }));

    if (copy && (typeof copy === 'string' || typeof copy === 'number')) {
      dynamicButtons.push({
        name: 'cta_copy',
        buttonParamsJson: JSON.stringify({
          display_text: 'Copy',
          copy_code: copy
        })
      });
    }

    if (urls && Array.isArray(urls)) {
      urls.forEach(url => {
        dynamicButtons.push({
          name: 'cta_url',
          buttonParamsJson: JSON.stringify({
            display_text: url[0],
            url: url[1],
            merchant_url: url[1]
          })
        })
      })
    }

    const interactiveMessage = {
      body: {text: text},
      footer: {text: footer},
      header: {
        hasMediaAttachment: false,
        imageMessage: img ? img.imageMessage : null,
        videoMessage: video ? video.videoMessage : null
      },
      nativeFlowMessage: {
        buttons: dynamicButtons,
        messageParamsJson: ''
      }
    };

    let msgL = generateWAMessageFromContent(jid, {
      viewOnceMessage: {
        message: {
          interactiveMessage
        }
      }
    }, {userJid: conn.user.jid, quoted});
    
    conn.relayMessage(jid, msgL.message, {messageId: msgL.key.id, ...options});
  },

  async sendList(conn, jid, title, text, buttonText, listSections, quoted, options = {}) {
    const sections = [...listSections];
    
    const message = {
      interactiveMessage: {
        header: {title: title},
        body: {text: text}, 
        nativeFlowMessage: {
          buttons: [
            {
              name: 'single_select',
              buttonParamsJson: JSON.stringify({
                title: buttonText,
                sections
              })
            }
          ],
          messageParamsJson: ''
        }
      }
    };
    await conn.relayMessage(jid, {viewOnceMessage: {message}}, {});
  },

  async sendEvent(conn, jid, text, des, loc, link) {
    let msg = generateWAMessageFromContent(jid, {
      messageContextInfo: {
        messageSecret: randomBytes(32)
      },
      eventMessage: {
        isCanceled: false,
        name: text,
        description: des,
        location: {
          degreesLatitude: 0,
          degreesLongitude: 0,
          name: loc
        },
        joinLink: link,
        startTime: 'm.messageTimestamp'
      }
    }, {});

    conn.relayMessage(jid, msg.message, {
      messageId: msg.key.id,
    });
  },

  async sendNyanCat(conn, jid, text = '', buffer, title, body, url, quoted, options) {
    if (buffer) {
      try {
        (type = await conn.getFile(buffer), buffer = type.data);
      } catch {
        buffer = buffer;
      }
    }
    const prep = generateWAMessageFromContent(jid, {extendedTextMessage: {text: text, contextInfo: {externalAdReply: {title: title, body: body, thumbnail: buffer, sourceUrl: url}, mentionedJid: await conn.parseMention(text)}}}, {quoted: quoted});
    return conn.relayMessage(jid, prep.message, {messageId: prep.key.id});
  },

  async sendPayment(conn, jid, amount, text, quoted, options) {
    conn.relayMessage(jid, {
      requestPaymentMessage: {
        currencyCodeIso4217: 'PEN',
        amount1000: amount,
        requestFrom: null,
        noteMessage: {
          extendedTextMessage: {
            text: text,
            contextInfo: {
              externalAdReply: {
                showAdAttribution: true,
              }, mentionedJid: conn.parseMention(text)
            }
          }
        }
      }
    }, {});
  }
};
