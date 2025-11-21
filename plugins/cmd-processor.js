export async function all(m) {
  if (!global.db.data) return;

  if (!global.db.data.sticker) global.db.data.sticker = {};

  const isDirectSticker = m.message?.stickerMessage;
  const isQuotedSticker = m.quoted && (m.quoted.mtype === 'stickerMessage' || m.quoted.type === 'stickerMessage');

  if (!isDirectSticker && !isQuotedSticker) return;

  let hash;

  if (m.message?.stickerMessage?.fileSha256) {
    const rawHash = m.message.stickerMessage.fileSha256;
    if (Buffer.isBuffer(rawHash)) {
      hash = rawHash.toString('base64');
    } else if (typeof rawHash === 'string') {
      hash = rawHash;
    } else {
      hash = Buffer.from(rawHash).toString('base64');
    }
  } else if (m.quoted?.fileSha256) {
    const rawHash = m.quoted.fileSha256;
    if (Buffer.isBuffer(rawHash)) {
      hash = rawHash.toString('base64');
    } else if (typeof rawHash === 'string') {
      hash = rawHash;
    } else {
      hash = Buffer.from(rawHash).toString('base64');
    }
  }

  if (!hash) return;

  const stickerData = global.db.data.sticker[hash];
  if (!stickerData) return;

  try {
    let cmdText = stickerData.text || '';
    const commandPrefixes = ['.', '#', '!', '/'];
    const isCommand = commandPrefixes.some(prefix => cmdText.startsWith(prefix));

    if (isCommand) {
      const fakeMessage = {
        ...m,
        text: cmdText,
        isCommand: true,
        sender: m.sender,
        chat: m.chat,
        isGroup: m.isGroup,
        key: m.key,
        id: m.id,
        fromMe: m.fromMe,
        reply: (text, options = {}) => this.reply(m.chat, text, m, options)
      };

      const usedPrefix = commandPrefixes.find(prefix => cmdText.startsWith(prefix));
      const commandWithoutPrefix = cmdText.slice(usedPrefix.length);
      const [command, ...args] = commandWithoutPrefix.trim().split(' ');

      for (const pluginName in global.plugins) {
        const plugin = global.plugins[pluginName];
        if (!plugin || plugin.disabled) continue;

        let isMatch = false;

        if (plugin.command) {
          if (plugin.command instanceof RegExp) {
            isMatch = plugin.command.test(command);
          } else if (Array.isArray(plugin.command)) {
            isMatch = plugin.command.some(cmd => {
              if (cmd instanceof RegExp) return cmd.test(command);
              return cmd === command;
            });
          } else if (typeof plugin.command === 'string') {
            isMatch = plugin.command === command;
          }
        }

        if (isMatch) {
          const _args = args;
          const text = args.join(' ');
          const groupMetadata = (m.isGroup ? ((this.chats[m.chat] || {}).metadata || await this.groupMetadata(m.chat).catch(() => null)) : {}) || {};
          const participants = (m.isGroup ? groupMetadata.participants : []) || [];
          const user = (m.isGroup ? participants.find((u) => this.decodeJid(u.id) === m.sender) : {}) || {};
          const bot = (m.isGroup ? participants.find((u) => this.decodeJid(u.id) === this.user.jid) : {}) || {};
          const isAdmin = user?.admin === 'admin' || user?.admin === 'superadmin' || false;
          const isBotAdmin = bot?.admin || false;
          const isOwnerCheck = global.owner.map(([num]) => num).includes(m.sender.replace(/[^0-9]/g, '')) || m.fromMe;

          if (plugin.admin && !isAdmin) {
            return this.reply(m.chat, 'Solo admins pueden usar este comando', m);
          }

          if (plugin.group && !m.isGroup) {
            return this.reply(m.chat, 'Este comando solo funciona en grupos', m);
          }

          if (plugin.owner && !isOwnerCheck) {
            return this.reply(m.chat, 'Solo el owner puede usar este comando', m);
          }

          const senderNum = this.decodeJid(m.sender || '').replace(/[^0-9]/g, '');
          const ownerNums = global.owner.map(([num]) => num);
          const isROwner = ownerNums.includes(senderNum);
          const isOwnerFinal = isROwner || m.fromMe;
          const isMods = isOwnerFinal || global.mods.map((v) => v.replace(/[^0-9]/g, '') + '@s.whatsapp.net').includes(m.sender);
          const isPrems = isROwner || isOwnerFinal || isMods || global.db.data.users[m.sender]?.premiumTime > 0;

          const extra = {
            usedPrefix,
            noPrefix: commandWithoutPrefix,
            _args,
            args,
            command,
            text,
            conn: this,
            participants,
            groupMetadata,
            user,
            bot,
            isROwner,
            isOwner: isOwnerFinal,
            isRAdmin: user?.admin === 'superadmin' || false,
            isAdmin,
            isBotAdmin,
            isPrems,
            isMods,
            chatUpdate: null,
            __dirname: './plugins',
            __filename: pluginName
          };

          await plugin.call(this, fakeMessage, extra);
          return;
        }
      }
    }

    if (stickerData.mentionedJid && stickerData.mentionedJid.length > 0) {
      await this.sendMessage(m.chat, {
        text: cmdText,
        mentions: stickerData.mentionedJid
      }, {
        quoted: m
      });
    } else {
      await this.reply(m.chat, cmdText, m);
    }

  } catch (error) {
    console.error('Error procesando comando de sticker:', error);
    try {
      await this.reply(m.chat, stickerData.text || 'Error al procesar comando', m);
    } catch (e) {
      console.error('Error crítico en cmd-processor:', e);
    }
  }
}

export const disabled = false;