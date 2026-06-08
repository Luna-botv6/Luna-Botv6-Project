import fs from 'fs';
import { loadAFK, saveAFK } from '../lib/afkDB.js';

const handler = async (m, { conn }) => {
  const chatId = m.chat;
  const chatData = global.db.data.chats[chatId] || {};

  const idioma = global.db.data.users[m.sender]?.language || global.defaultLenguaje || 'es';
  let _t = {};
  try {
    const _lang = idioma || global.defaultLenguaje || 'es';
    _t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${_lang}.json`, 'utf8'));
  } catch {
    try { _t = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8')); } catch {}
  }
  const tradutor = _t.plugins.afk_afk;

  if (chatData.afkAllowed === false) {
    return m.reply(tradutor.desactivado);
  }

  const text = m.text?.trim();
  const afk = loadAFK();

  afk[m.sender] = {
    reason: text || '',
    lastseen: Date.now()
  };
  saveAFK(afk);

  m.reply(`${tradutor.texto1[0]} ${conn.getName(m.sender)} ${tradutor.texto1[1]}${text ? ': ' + text : ''}`);
};

handler.help = ['afk [motivo]'];
handler.tags = ['main'];
handler.command = /^afk$/i;

export default handler;
