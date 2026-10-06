import chalk from 'chalk';
import { getGroupDataForPlugin, clearGroupCache, resolveRealJidDeLid, buscarNombreEnParticipantes } from '../lib/funcion/pluginHelper.js';
import { registrarKickban, listarKickbans, quitarKickban, normalizarNumero, obtenerKickban, contarGrupos } from '../lib/funcion/kickban-store.js';
import { cinta, cabecera, titulo, pie, campo, fila, mensajeKickban, mensajeLista, mensajeSinRegistro, escapeCinta } from '../lib/funcion/kickban-estilo.js';
import { getOwnerNumbers } from '../lib/funcion/system-owners.js';

const cooldowns = new Map();
const COOLDOWN_MS = 45 * 1000;

function limiteCooldown() {
  const desdeGlobal = Number(global.__kickbanCooldownMs);
  return Number.isFinite(desdeGlobal) && desdeGlobal >= 0 ? desdeGlobal : COOLDOWN_MS;
}

const VIGORIZACION_ESPERA_MS = 5000;

async function esperarVigorizacion(glob) {
  const ms = Number(glob?.__kickbanEsperaMs);
  const espera = Number.isFinite(ms) && ms >= 0 ? ms : VIGORIZACION_ESPERA_MS;
  if (espera) await new Promise((r) => setTimeout(r, espera));
}

function aviso(m, texto, extra = {}) {
  return m.reply(texto, null, extra);
}

function corto(emoji, linea, nota) {
  return `${emoji} *${linea}*${nota ? `\n_${nota}_` : ''}`;
}

function ownerTags() {
  return getOwnerNumbers();
}

function esProtegido(numero) {
  const num = String(numero || '').replace(/\D/g, '');
  if (!num) return false;
  return ownerTags().includes(num);
}

function resolverLid(jid, participants) {
  if (!jid?.includes('@lid')) return jid;
  return participants.find(p => p.lid === jid)?.id || jid;
}

function buscarParticipante(participants, raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, '');
  return participants.find(p => p.id === raw)
    || participants.find(p => p.lid === raw)
    || participants.find(p => String(p.id || '').replace(/\D/g, '') === digits)
    || participants.find(p => String(p.lid || '').replace(/\D/g, '') === digits)
    || null;
}

function sacarNumeroDeTexto(text) {
  const limpio = String(text || '').replace(/@\d+/g, ' ').trim();
  const match = limpio.match(/(\d{8,15})/);
  return match ? match[1] : null;
}

function sacarMotivo(text) {
  return String(text || '')
    .replace(/@\d+/g, ' ')
    .replace(/\+?\d{8,15}/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function esNumeroLid(jid) {
  return String(jid || '').includes('@lid');
}

async function nombreDe(conn, jid, participants) {
  const delGrupo = buscarNombreEnParticipantes(participants, jid);
  if (delGrupo) return delGrupo;
  const real = resolveRealJidDeLid(jid);
  if (!esNumeroLid(real)) {
    for (const getter of ['getName', 'getDisplayName']) {
      if (typeof conn[getter] !== 'function') continue;
      try {
        const nombre = await conn[getter](real);
        if (nombre && !/^[\d\s@.:+-]+$/.test(String(nombre))) return String(nombre).slice(0, 40);
      } catch {}
    }
  }
  try {
    const store = conn.store?.message?.get?.(real);
    const nombre = store?.pushName || store?.verifiedName;
    if (nombre) return String(nombre).slice(0, 40);
  } catch {}
  return '';
}

function numeroRealDe(jid, participants) {
  const delGrupo = participants.find(p => p.id === jid || p.lid === jid);
  const candidato = delGrupo?.id || resolveRealJidDeLid(jid) || jid;
  if (esNumeroLid(candidato)) return normalizarNumero(jid);
  return normalizarNumero(candidato);
}

function clavesDeSalida(chatId, numero, objetivo, participante) {
  const digitos = s => String(s || '').split('@')[0].replace(/\D/g, '');
  const claves = new Set();
  for (const item of [numero, objetivo, participante?.id, participante?.lid, participante?.phoneNumber]) {
    const d = digitos(item);
    if (d) claves.add(`${chatId}_${d}`);
    if (item) claves.add(`${chatId}_${item}`);
  }
  return claves;
}

function mencionesDe(participants, ...jids) {
  const lista = new Set();
  const agregar = (jid) => {
    if (!jid) return;
    const texto = String(jid);
    const soloDigitos = /^\d{8,}$/.test(texto);
    if (soloDigitos) lista.add(texto + '@s.whatsapp.net');
    else lista.add(texto);
    const p = participants.find(x => x.id === texto || x.lid === texto
      || String(texto).split('@')[0] === String(x.id).split('@')[0]
      || (x.lid && String(texto).split('@')[0] === String(x.lid).split('@')[0]));
    if (p?.id) lista.add(p.id);
    if (p?.lid) lista.add(p.lid);
    const real = resolveRealJidDeLid(texto);
    if (real && String(real).includes('@')) lista.add(real);
    const digitos = texto.split('@')[0].replace(/\D/g, '');
    if (digitos.length >= 8) lista.add(digitos + '@s.whatsapp.net');
  };
  jids.forEach(agregar);
  return [...lista].filter(x => typeof x === 'string' && x.includes('@') && x.split('@')[0].length >= 8);
}

async function cmdKickban(m, ctx) {
  const { conn, usedPrefix, command, isOwner } = ctx;

  if (!m.isGroup) return aviso(m, corto('👥', 'El kickban solo funciona en grupos', 'probalo en un grupo, no en privado.'));

  const { participants, isAdmin, isBotAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender);

  if (!isAdmin && !isOwner) {
    return aviso(m, corto('🔒', 'Solo administradores pueden usar el kickban', 'pedile a un admin que te lo haga.'));
  }

  if (!isBotAdmin) {
    return aviso(m, corto('🤖', 'Yo no soy admin en este grupo', 'dame admin y recién ahí puedo expulsar a alguien.'));
  }

  if (!global.db?.data?.settings?.[conn.user.jid]?.restrict) {
    return aviso(m, corto('🛡️', 'El modo restrict está apagado', 'sin restrict no puedo Kickbanear a nadie.'));
  }

  const ahora = Date.now();
  const limite = limiteCooldown();
  const ultimo = cooldowns.get(m.chat) || 0;

  const bruto = m.mentionedJid?.[0] || m.quoted?.sender || null;
  const numeroTexto = bruto ? null : sacarNumeroDeTexto(ctx.text);

  if (!bruto && !numeroTexto) {
    return aviso(m, corto('📖', `Uso: ${usedPrefix}${command} @usuario motivo`, 'Mencioná a quien querés vetar. También acepta solo el número.'));
  }

  let objetivo = bruto ? resolverLid(bruto, participants) : numeroTexto + '@s.whatsapp.net';
  const encontrado = buscarParticipante(participants, objetivo) || buscarParticipante(participants, numeroTexto);
  if (encontrado) objetivo = encontrado.id;

  const numero = numeroRealDe(objetivo, participants) || normalizarNumero(numeroTexto || objetivo);
  if (!numero) {
    return aviso(m, corto('❓', 'Ese no parece un número de teléfono', 'mencioná al usuario o escribí su número completo.'));
  }

  if (numero === String(conn.user.jid || '').replace(/\D/g, '')) {
    return aviso(m, corto('🙃', 'No me puedo vetar a mí mismo', 'buscate a otro 😄'));
  }

  if (esProtegido(numero)) {
    return aviso(m, corto('👑', 'Ese es un owner, no lo toco', 'ese veto no se puede, ni probando 🛡️'));
  }

  if (encontrado && (encontrado.admin === 'admin' || encontrado.admin === 'superadmin')) {
    return aviso(m, corto('🛡️', 'No puedo expulsar a un administrador', 'bajale el admin primero y reintentá.'));
  }

  if (!encontrado) {
    return aviso(m, corto('🚶', `${numero} no está en este grupo`, 'solo puedo vetar a alguien que está adentro.'));
  }

  if (ahora - ultimo < limite) {
    const faltan = Math.ceil((limite - (ahora - ultimo)) / 1000);
    return aviso(m, corto('⏳', `Esperá ${faltan} segundo(s)`, 'uno por vez, así no abusás del permaban.'));
  }
  cooldowns.set(m.chat, ahora);

  const motivo = sacarMotivo(ctx.text) || 'sin motivo especificado';
  const nombre = (await nombreDe(conn, objetivo, participants)) || numero;
  const autorResuelto = resolverLid(m.sender, participants) || m.sender;
  const autorNombre = (await nombreDe(conn, autorResuelto, participants)) || '';

  const entrada = registrarKickban({
    chatId: m.chat,
    jid: objetivo,
    lid: encontrado?.lid,
    numero,
    nombre,
    motivo,
    autor: autorResuelto.split('@')[0],
    autorNombre
  });

  if (entrada.veces > 1) {
    console.log(chalk.yellow(`[kickban] reingreso bloqueado: ${numero} en ${m.chat} (${entrada.veces} veces)`));
  }

  if (!global.kickSkipGoodbye) global.kickSkipGoodbye = new Set();
  for (const clave of clavesDeSalida(m.chat, numero, objetivo, encontrado)) {
    global.kickSkipGoodbye.add(clave);
  }

  let expulsado = true;
  try {
    await esperarVigorizacion(global);
    await conn.groupParticipantsUpdate(m.chat, [objetivo], 'remove');
    clearGroupCache(m.chat, conn);
  } catch (e) {
    expulsado = false;
    console.log(chalk.red(`[kickban] no se pudo expulsar a ${numero}: ${e.message}`));
  }

  const grupoNombre = (await conn.getName(m.chat).catch(() => '')) || '';

  if (!expulsado) {
    return aviso(m, corto('😵', `No pude expulsar a ${nombre}`, 'igual quedó vetado: si vuelve a entrar, lo saco.'), { mentions: mencionesDe(participants, objetivo, numero) });
  }

  const texto = mensajeKickban({
    numero,
    nombre,
    motivo,
    autor: entrada.autor,
    autorNombre: entrada.autorNombre,
    fechaTexto: entrada.fechaTexto,
    veces: entrada.veces,
    comandoUnban: `${usedPrefix}unkickban`
  });

  const menciones = mencionesDe(participants, objetivo, numero, autorResuelto, entrada.autor);
  await conn.sendMessage(m.chat, { text: texto, mentions: menciones }, { quoted: m });
}

async function cmdUnkickban(m, ctx) {
  const { conn, usedPrefix, command, isOwner } = ctx;

  if (!m.isGroup) return aviso(m, corto('👥', 'El unkickban solo funciona en grupos', 'probalo en un grupo, no en privado.'));

  const { participants, isAdmin, isBotAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender);
  if (!isAdmin && !isOwner) {
    return aviso(m, corto('🔒', 'Solo administradores pueden levantar el veto', 'pedile a un admin que lo haga.'));
  }

  const grupoNombre = (await conn.getName(m.chat).catch(() => '')) || '';

  const eleccion = (m.mentionedJid?.length && m.mentionedJid[0])
    || m.quoted?.sender
    || sacarNumeroDeTexto(ctx.text)
    || null;

  const numero = normalizarNumero(eleccion)
    || normalizarNumero(resolverLid(eleccion, participants) || eleccion)
    || normalizarNumero(resolveRealJidDeLid(eleccion) || eleccion);

  if (!numero) {
    const lista = listarKickbans(m.chat);
    if (!lista.length) return aviso(m, mensajeSinRegistro());
    return aviso(m, `${cabecera('🔓', 'CÓMO SE USA', grupoNombre)}
${usedPrefix}${command} <numero>

_vetados en este grupo:_
${lista.slice(0, 8).map((e, i) => `${String(i + 1).padStart(2, '0')} ▸ 👤 *${escapeCinta(e.nombre || e.numero, 24)}*  ▪  \`${e.numero}\``).join('\n')}

_(para más razón de cada uno: ${usedPrefix}kicklist)_`);
  }

  const entrada = obtenerKickban(m.chat, numero);
  if (!entrada) {
    return aviso(m, corto('🤷', `${numero} no está vetado`, 'si te fijaste en la kicklist y aparece, pasame el número completo.'), { mentions: mencionesDe(participants, eleccion) });
  }

  const numeroFinal = entrada.numero || numero;

  let dentro = null;
  try {
    dentro = buscarParticipante(participants, numeroFinal);
  } catch {}

  if (dentro && !isBotAdmin) {
    return aviso(m, corto('🤖', `${numeroFinal} ya está dentro del grupo`, 'dame admin y lo expulso para que entre limpio.'));
  }

  quitarKickban(m.chat, numeroFinal);

  let expulsado = false;
  if (dentro && dentro.admin !== 'admin' && dentro.admin !== 'superadmin') {
    try {
      await conn.groupParticipantsUpdate(m.chat, [dentro.id], 'remove');
      clearGroupCache(m.chat, conn);
      expulsado = true;
    } catch (e) {
      console.log(chalk.red(`[unkickban] no se pudo expulsar a ${numeroFinal}: ${e.message}`));
    }
  }

  const menciones = dentro?.id ? mencionesDe(participants, dentro.id, numeroFinal) : [];

  return aviso(m, `${cabecera('🔓', 'VETO LEVANTADO', grupoNombre)}

👤 *${escapeCinta(entrada.nombre || numeroFinal, 30)}*
📱 \`${numeroFinal}\`
📝 *motivo anterior:* ${escapeCinta(entrada.motivo, 60)}
✅ *ya puede volver a entrar*

_${expulsado
  ? 'ya lo expulsé de nuevo, entra limpio 😊'
  : dentro
    ? 'el veto se levantó pero quedó dentro, que un admin lo saque'
    : 'cuando vuelva a entrar, entra normal 👌'}_`, menciones.length ? { mentions: menciones } : {});
}

async function cmdKicklist(m, ctx) {
  const { conn, isOwner } = ctx;

  if (!m.isGroup) return aviso(m, corto('👥', 'La kicklist solo funciona en grupos', 'probala en un grupo, no en privado.'));

  const { isAdmin } = await getGroupDataForPlugin(conn, m.chat, m.sender);
  if (!isAdmin && !isOwner) {
    return aviso(m, corto('🔒', 'Solo administradores pueden ver la kicklist', 'si sos admin, reintentá en un segundo.'));
  }

  const entradas = listarKickbans(m.chat);
  if (!entradas.length) return aviso(m, mensajeSinRegistro());

  const grupoNombre = (await conn.getName(m.chat).catch(() => '')) || '';
  const totalGrupos = contarGrupos();

  return aviso(m, mensajeLista({
    chatId: m.chat,
    grupoNombre,
    entradas,
    comandoUnban: `${ctx.usedPrefix}unkickban`,
    totalGrupos
  }));
}

const handler = async (m, ctx) => {
  try {
    if (!m?.chat) return;
    const comando = String(ctx.command || '').toLowerCase();

    if (comando === 'kicklist' || comando === 'listakick' || comando === 'listakickban') {
      return await cmdKicklist(m, ctx);
    }
    if (comando === 'unkickban' || comando === 'unbankick' || comando === 'desveto' || comando === 'liftban') {
      return await cmdUnkickban(m, ctx);
    }
    if (comando === 'kickban' || comando === 'perma' || comando === 'permaban' || comando === 'vbaneado') {
      return await cmdKickban(m, ctx);
    }
  } catch (e) {
    console.log(chalk.red(`[kickban] error: ${e.message}`));
    try {
      await m.reply('💥 *Algo se rompió en el kickban*\n_probalo de nuevo en un rato._');
    } catch {}
  }
};

handler.command = /^(kickban|permaban|perma|vbaneado|unkickban|unbankick|desveto|liftban|kicklist|listakick|listakickban)$/i;
handler.group = true;
handler.ownerProtect = true;
handler._cooldowns = cooldowns;
export default handler;
