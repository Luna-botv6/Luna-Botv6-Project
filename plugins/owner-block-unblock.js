import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const SESSION_PATH = './MysticSession';

function buscarJIDenLidMappings(lidBuscado) {
  const lidNum = lidBuscado.split('@')[0];
  try {
    const archivos = readdirSync(SESSION_PATH).filter(f => f.startsWith('lid-mapping-'));
    for (const archivo of archivos) {
      try {
        const contenido = readFileSync(join(SESSION_PATH, archivo), 'utf8').trim().replace(/"/g, '');
        if (contenido.includes(lidNum)) {
          const jidNum = archivo.replace('lid-mapping-', '').replace('.json', '');
          return `${jidNum}@s.whatsapp.net`;
        }
      } catch {}
    }
  } catch (e) {}
  return null;
}

async function bloquearUsuario(conn, jidReal, lidOriginal) {
  console.log(`[BLOCK] Intentando bloquear → JID: ${jidReal} | LID: ${lidOriginal}`);

  const metodos = [
    // 1. Oficial (actualmente bugueado)
    async () => {
      await conn.updateBlockStatus(jidReal, 'block');
      return true;
    },
    // 2. Query binaria JID
    async () => {
      await conn.query({
        tag: 'iq',
        attrs: { type: 'set', xmlns: 'blocklist', to: '@s.whatsapp.net' },
        content: [{ tag: 'item', attrs: { action: 'block', jid: jidReal } }]
      });
      return true;
    },
    // 3. Query binaria con LID
    async () => {
      await conn.query({
        tag: 'iq',
        attrs: { type: 'set', xmlns: 'blocklist', to: '@s.whatsapp.net' },
        content: [{ tag: 'item', attrs: { action: 'block', jid: lidOriginal } }]
      });
      return true;
    },
    // 4. blockUser directo
    async () => {
      if (typeof conn.blockUser === 'function') {
        await conn.blockUser(jidReal);
        return true;
      }
      return false;
    }
  ];

  for (const metodo of metodos) {
    try {
      if (await metodo()) {
        console.log('[BLOCK] ✅ ÉXITO con un método');
        return true;
      }
    } catch (e) {
      console.log('[BLOCK] Falló:', e?.message || e);
    }
  }

  return false;
}

// ====================== HANDLER ======================
const handler = async (m, { text, conn, usedPrefix, command }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.owner_block_unblock || {};
  console.log(`[DEBUG] Comando: ${command} | Texto: ${text}`);

  let user = m.mentionedJid?.[0] || 
             m.quoted?.sender || 
             (text ? text.replace(/[^0-9]/g, '').trim() : null);

  if (!user) {
    const example = (t.uso_erroneo ? t.uso_erroneo
      .replace('{comando}', usedPrefix + command)
      .replace('{usuario}', m.sender.split('@')[0]) : null) ||
      `*[❗] USO ERRÓNEO, EJEMPLO:*\n*${usedPrefix + command} @${m.sender.split('@')[0]}*`;
    return conn.reply(m.chat, example, m, { mentions: [m.sender] });
  }

  let lidOriginal = user;
  if (user.includes('@lid')) {
    const jidReal = buscarJIDenLidMappings(user);
    if (jidReal) user = jidReal;
  } else if (!user.endsWith('@s.whatsapp.net')) {
    user = user.replace(/@.+$/, '') + '@s.whatsapp.net';
  }

  console.log(`[DEBUG] Usuario final: ${user}`);

  let exito = false;

  if (command === 'block' || command === 'blok') {
    exito = await bloquearUsuario(conn, user, lidOriginal);
  } else {
    try {
      await conn.updateBlockStatus(user, 'unblock');
      exito = true;
    } catch (e) {
      console.log('[UNBLOCK] Falló:', e?.message);
    }
  }

  if (exito) {
    const accion = command.includes('block') ? (t.bloqueado || 'BLOQUEADO') : (t.desbloqueado || 'DESBLOQUEADO');
    await conn.reply(m.chat, (t.exito ? t.exito
      .replace('{accion}', accion)
      .replace('{usuario}', user.split('@')[0]) : null) ||
      `*[✅] ${accion} correctamente a @${user.split('@')[0]}*`, m, { mentions: [user] });
  } else {
    await conn.reply(m.chat, (t.error_block || '*[❌] No se pudo bloquear al usuario.\n\nWhatsApp está rechazando la acción (bad-request).\nPrueba bloquearlo manualmente desde tu celular principal.'), m);
  }
};

handler.command = /^(block|blok|unblock|unblok)$/i;
handler.rowner = true;
handler.group = true;

export default handler;