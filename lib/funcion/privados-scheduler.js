import fs from 'fs';
import { listarPrivados, actualizarPrivado, ultimoEnvioANumero } from './privados-store.js';
import { limpiarSubidasViejas, mediaHuerfana, borrarMedia } from './privados-media.js';

const TICK_MS = 20000;
const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;

export const LIMITES = {
  minIntervaloMs: 75000,
  jitterMs: 30000,
  maxPorHora: 12,
  maxPorDia: 40,
  maxIntentos: 2,
  reintentoMs: 10 * 60 * 1000,
  vencidoMs: 24 * HORA_MS,
  cooldownMismoNumeroMs: HORA_MS
};

let timer = null;
let limpiezaTimer = null;
let trabajando = false;

function esperar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorPermanente(mensaje) {
  const e = new Error(mensaje);
  e.permanente = true;
  return e;
}

function borrarArchivo(item) {
  if (!item?.media) return;
  borrarMedia(item.media);
}

function recuperarColgados() {
  const ahora = Date.now();
  for (const item of listarPrivados()) {
    if (item.estado !== 'enviando') continue;
    const referencia = Number(item.ultimoIntentoEn || item.creadoEn || 0);
    if (ahora - referencia < 5 * 60 * 1000) continue;
    borrarArchivo(item);
    actualizarPrivado(item.id, {
      estado: 'error',
      error: 'Se cortó el envío a mitad de camino. No se reintenta solo para no mandar dos veces.',
      mediaEliminada: true
    });
  }
}

function limpiarHuerfanos() {
  const items = listarPrivados();
  const enUso = items.filter((i) => i.media?.archivo && !i.mediaEliminada).map((i) => i.media.archivo);
  try {
    mediaHuerfana(enUso);
  } catch {}
  try {
    limpiarSubidasViejas();
  } catch {}
}

export function iniciarSchedulerPrivados(obtenerConn) {
  if (timer) return;
  const obtener = typeof obtenerConn === 'function' ? obtenerConn : () => global.conn;
  const ciclo = () => {
    drenarPrivados(obtener()).catch((e) => console.error('[privados] error en el ciclo:', e.message));
  };
  try {
    recuperarColgados();
    limpiarHuerfanos();
  } catch {}
  timer = setInterval(ciclo, TICK_MS);
  timer.unref?.();
  setTimeout(ciclo, 12000).unref?.();
  limpiezaTimer = setInterval(limpiarHuerfanos, 30 * 60 * 1000);
  limpiezaTimer.unref?.();
}

export function detenerSchedulerPrivados() {
  if (timer) clearInterval(timer);
  if (limpiezaTimer) clearInterval(limpiezaTimer);
  timer = null;
  limpiezaTimer = null;
}

async function sincronizarContacto(conn, jid, esperarFn) {
  try {
    if (typeof conn.presenceSubscribe === 'function') await conn.presenceSubscribe(jid);
  } catch {}
  try {
    if (typeof conn.sendPresenceUpdate === 'function') await conn.sendPresenceUpdate('composing', jid);
  } catch {}
  await esperarFn(1800 + Math.floor(Math.random() * 1700));
}

async function enviarMensaje(conn, item, esperarFn) {
  const nombreBot = (typeof global.getBotName === 'function' ? global.getBotName(conn) : global.BotName) || 'Luna';
  const firma = '— *' + nombreBot + '*';
  const texto = String(item.texto || '').trim();
  const caption = texto ? texto + '\n\n' + firma : firma;
  const media = item.media;

  if (!media || !media.archivo || !fs.existsSync(media.archivo)) {
    if (!texto) throw errorPermanente('El mensaje no tiene contenido para enviar.');
    await conn.sendMessage(item.jid, { text: caption });
    return;
  }

  const buffer = fs.readFileSync(media.archivo);
  const mimetype = media.mimetype || 'application/octet-stream';
  let payload;
  if (media.tipo === 'imagen') payload = { image: buffer, mimetype, caption };
  else if (media.tipo === 'video') payload = { video: buffer, mimetype, caption };
  else if (media.tipo === 'audio') payload = { audio: buffer, mimetype, ptt: false };
  else payload = { document: buffer, mimetype, fileName: media.nombre || 'archivo', caption };

  await conn.sendMessage(item.jid, payload);

  if (media.tipo === 'audio') {
    try {
      if (typeof conn.sendPresenceUpdate === 'function') await conn.sendPresenceUpdate('paused', item.jid);
    } catch {}
    await esperarFn(1200);
    await conn.sendMessage(item.jid, { text: caption });
  } else {
    try {
      if (typeof conn.sendPresenceUpdate === 'function') await conn.sendPresenceUpdate('paused', item.jid);
    } catch {}
  }
}

async function enviarItem(conn, item, esperarFn) {
  actualizarPrivado(item.id, { estado: 'enviando', ultimoIntentoEn: Date.now(), error: '' });
  try {
    const jid = item.jid || item.numero + '@s.whatsapp.net';
    const usuario = global.db?.data?.users?.[jid];
    if (usuario?.banned) throw errorPermanente('El usuario está baneado en el bot.');

    if (typeof conn.onWhatsApp === 'function') {
      const resultado = await conn.onWhatsApp(jid);
      const fila = Array.isArray(resultado) ? resultado[0] : resultado;
      if (!fila) throw new Error('No pude verificar el número en WhatsApp. Se reintenta más tarde.');
      if (fila.exists === false) throw errorPermanente('Ese número no tiene WhatsApp.');
    }

    await sincronizarContacto(conn, jid, esperarFn);
    await enviarMensaje(conn, item, esperarFn);

    borrarArchivo(item);
    actualizarPrivado(item.id, {
      estado: 'enviado',
      enviadoEn: Date.now(),
      intentos: Number(item.intentos || 0) + 1,
      error: '',
      mediaEliminada: true
    });
    return { enviado: true };
  } catch (e) {
    const permanente = e?.permanente === true;
    const intentos = Number(item.intentos || 0) + 1;
    if (permanente || intentos >= LIMITES.maxIntentos) {
      borrarArchivo(item);
      actualizarPrivado(item.id, {
        estado: 'error',
        error: e.message || 'No se pudo enviar',
        intentos,
        mediaEliminada: true,
        ultimoIntentoEn: Date.now()
      });
    } else {
      actualizarPrivado(item.id, {
        estado: 'pendiente',
        error: e.message || 'No se pudo enviar',
        intentos,
        enviarEn: Date.now() + LIMITES.reintentoMs,
        ultimoIntentoEn: Date.now()
      });
    }
    return { enviado: false, detener: true };
  }
}

export async function drenarPrivados(conn, opciones = {}) {
  const ahora = Number(opciones.ahora) || Date.now();
  if (!conn || !conn.user?.jid) return { enviados: 0, motivo: 'sin_conexion' };
  if (trabajando) return { enviados: 0, motivo: 'ocupado' };
  trabajando = true;
  try {
    const minIntervalo = opciones.minIntervaloMs ?? LIMITES.minIntervaloMs;
    const jitter = opciones.jitterMs ?? LIMITES.jitterMs;
    const esperarFn = typeof opciones.esperar === 'function' ? opciones.esperar : esperar;
    const items = listarPrivados();

    const enviadosHora = items.filter((i) => i.estado === 'enviado' && Number(i.enviadoEn || 0) > ahora - HORA_MS).length;
    const enviadosDia = items.filter((i) => i.estado === 'enviado' && Number(i.enviadoEn || 0) > ahora - DIA_MS).length;
    if (enviadosHora >= LIMITES.maxPorHora) return { enviados: 0, motivo: 'limite_hora' };
    if (enviadosDia >= LIMITES.maxPorDia) return { enviados: 0, motivo: 'limite_dia' };

    const ultimo = items.reduce((max, i) => Math.max(max, Number(i.enviadoEn || 0)), 0);
    if (ultimo && ahora - ultimo < minIntervalo + Math.random() * jitter) {
      return { enviados: 0, motivo: 'espera' };
    }

    const pendientes = items
      .filter((i) => i.estado === 'pendiente')
      .sort((a, b) => Number(a.enviarEn || 0) - Number(b.enviarEn || 0));

    for (const item of pendientes) {
      if (Number(item.enviarEn || 0) > ahora) continue;
      if (ahora - Number(item.enviarEn || 0) > LIMITES.vencidoMs) {
        borrarArchivo(item);
        actualizarPrivado(item.id, {
          estado: 'vencido',
          error: 'Venció sin enviarse (más de 24 horas tarde). Programalo de nuevo.',
          mediaEliminada: true
        });
        continue;
      }
      const ultimoMismo = ultimoEnvioANumero(item.numero);
      if (ultimoMismo && ahora - ultimoMismo < LIMITES.cooldownMismoNumeroMs) {
        actualizarPrivado(item.id, {
          enviarEn: ultimoMismo + LIMITES.cooldownMismoNumeroMs + 60000,
          nota: 'Se movió porque a este número ya se le mandó algo hace menos de 1 hora.'
        });
        continue;
      }
      const r = await enviarItem(conn, item, esperarFn);
      if (r.enviado) return { enviados: 1, motivo: 'ok' };
      if (r.detener) return { enviados: 0, motivo: 'error' };
    }

    return { enviados: 0, motivo: 'sin_pendientes' };
  } finally {
    trabajando = false;
  }
}

export function resumenPrivados(ahora = Date.now()) {
  const items = listarPrivados();
  const pendientes = items.filter((i) => i.estado === 'pendiente');
  const enviadosHoy = items.filter((i) => i.estado === 'enviado' && Number(i.enviadoEn || 0) > ahora - DIA_MS).length;
  const proximo = pendientes
    .map((i) => Number(i.enviarEn || 0))
    .filter((t) => t > ahora)
    .sort((a, b) => a - b)[0];
  return {
    pendientes: pendientes.length,
    enviadosHoy,
    proximoEnviarEn: proximo || null,
    limitePorHora: LIMITES.maxPorHora,
    limitePorDia: LIMITES.maxPorDia,
    intervaloMinimoMs: LIMITES.minIntervaloMs
  };
}
