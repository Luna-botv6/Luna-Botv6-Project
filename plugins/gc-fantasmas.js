import * as fs from 'fs';
const cooldowns = new Map();

const handler = async (m, {isOwner, conn, text, participants, args, command, usedPrefix}) => {
  const chatId = m.chat;
  const cooldownTime = 2 * 60 * 1000;
  const now = Date.now();
  if (usedPrefix == 'a' || usedPrefix == 'A') return;

  const groupMetadata = await conn.groupMetadata(m.chat);
  const groupAdmins = groupMetadata.participants.filter(p => p.admin !== null).map(p => p.id);
  let realUserJid = m.sender;
  if (m.sender.includes('@lid')) {
    const participantData = groupMetadata.participants.find(p => p.lid === m.sender);
    if (participantData && participantData.id) realUserJid = participantData.id;
  }
  const isUserAdmin = groupAdmins.includes(realUserJid);
  if (!isUserAdmin && !isOwner) return m.reply('⚠️ Este comando solo puede ser usado por administradores del grupo.');

  if (cooldowns.has(chatId)) {
    const expirationTime = cooldowns.get(chatId) + cooldownTime;
    if (now < expirationTime) {
      const timeLeft = Math.ceil((expirationTime - now) / 1000);
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      return m.reply(`⏰ Debes esperar ${minutes}m ${seconds}s antes de usar este comando nuevamente.`);
    }
  }
  cooldowns.set(chatId, now);

  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.gc_fantasmas;

  const botNumber = conn.user.id.split(':')[0] + '@s.whatsapp.net';
  const botInGroup = participants.find(u => u.id === botNumber);
  const botIsAdmin = botInGroup && (botInGroup.admin === 'admin' || botInGroup.admin === 'superadmin');

  const member = participants.map(u => u.id);
  let sum = !text ? member.length : text;
  let total = 0;
  const sider = [];

  for (let i = 0; i < sum; i++) {
    const users = m.isGroup ? participants.find(u => u.id == member[i]) : {};
    if ((typeof global.db.data.users[member[i]] == 'undefined' || global.db.data.users[member[i]].chat == 0) && !users?.admin) {
      if (typeof global.db.data.users[member[i]] !== 'undefined') {
        if (global.db.data.users[member[i]].whitelist == false) {
          total++;
          sider.push(member[i]);
        }
      } else {
        total++;
        sider.push(member[i]);
      }
    }
  }

  if (total == 0) return conn.reply(m.chat, tradutor.texto1, m);

  const texto = `${tradutor.texto2[0]} ${await conn.getName(m.chat)}
${tradutor.texto2[1]} ${sum}

${tradutor.texto2[2]}
${sider.map(v => '  👉🏻 @' + v.replace(/@.+/, '')).join('\n')}

${tradutor.texto2[3]}`;

  if (botIsAdmin) conn.sendMessage(m.chat, {text: texto, mentions: sider}, {quoted: m});
  else conn.reply(m.chat, texto, m);
};

handler.command = /^(verfantasmas|fantasmas|sider)$/i;
handler.tags = ['group'];
handler.group = true;
export default handler;
