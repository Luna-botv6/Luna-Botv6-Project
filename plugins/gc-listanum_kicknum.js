


import fs from 'fs';
import { marcarMotivo } from '../lib/funcion/leave-reason.js';
import { esInmune } from '../lib/funcion/proteccion-grupo.js';
import { soloDigitos } from '../lib/funcion/participantes.js';

const handler = async (m, {conn, args, groupMetadata, participants, usedPrefix, command, isBotAdmin, isSuperAdmin}) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${idioma}.json`));
  const tradutor = _translate.plugins.gc_listanum_kicknum;

  if (!args[0]) return m.reply(`${tradutor.texto1} ${usedPrefix + command} 52*`);
  if (isNaN(args[0])) return m.reply(`${tradutor.texto2} ${usedPrefix + command} 52*`);
  const lol = args[0].replace(/[+]/g, '').replace(/\D/g, '');
  const jidDe = (u) => u?.id || u?.phoneNumber || u?.lid || null;
  const coincide = (u) => [u?.id, u?.lid, u?.phoneNumber]
    .filter(Boolean)
    .some((v) => soloDigitos(v).startsWith(lol));
  const coincidentes = participants.filter((u) => u && coincide(u) && jidDe(u) !== conn.user.jid);
  const ps = coincidentes.map(jidDe).filter(Boolean);
  const bot = global.db.data.settings[conn.user.jid] || {};
  if (!ps.length) return m.reply(`${tradutor.texto3} +${lol}*`);
  const numeros = ps.map((v)=> '⭔ @' + v.replace(/@.+/, ''));
  const delay = (time) => new Promise((res)=>setTimeout(res, time));
  switch (command) {
  case 'listanum': case 'listnum':
    conn.reply(m.chat, `${tradutor.texto4[0]} +${lol} ${tradutor.texto4[1]}\n\n` + numeros.join`\n`, m, {mentions: ps});
    break;
  case 'kicknum':
    if (!bot.restrict) return m.reply(`${tradutor.texto5[0]} (#𝚎𝚗𝚊𝚋𝚕𝚎 𝚛𝚎𝚜𝚝𝚛𝚒𝚌𝚝) ${tradutor.texto5[1]}`);
    if (!isBotAdmin) return m.reply(tradutor.texto6);
    conn.reply(m.chat, `${tradutor.texto7[0]} +${lol}, ${tradutor.texto7[1]}`, m);
    const ownerGroup = m.chat.split`-`[0] + '@s.whatsapp.net';
    for (const user of ps) {
      const error = `@${user.split('@')[0]} ${tradutor.texto8}`;
      if (user !== ownerGroup + '@s.whatsapp.net' && user !== global.conn.user.jid && user !== global.owner + '@s.whatsapp.net' && user !== isSuperAdmin && isBotAdmin && bot.restrict) {
        if (esInmune(m.chat, user, conn, participants || [])) continue;
        await delay(2000);
        marcarMotivo(m.chat, [user], { tipo: 'listanum', autor: m.sender });
        const responseb = await conn.groupParticipantsUpdate(m.chat, [user], 'remove');
        if (responseb[0].status === '404') m.reply(error, m.chat, {mentions: conn.parseMention(error)});
        await delay(10000);
      } else return m.reply(tradutor.texto9);
    }
    break;
  }
};
handler.command = /^(listanum|kicknum|listnum)$/i;
handler.group = handler.botAdmin = handler.admin = true;
handler.fail = null;
export default handler;
