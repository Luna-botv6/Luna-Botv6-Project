import { registrarKickban } from './kickban-store.js';

export function cinta(lineas) {
  return lineas.join('\n');
}

export function cabecera(emoji, principal, sub) {
  return [
    `${emoji} ▌▌ *${principal}* ▌▌`,
    sub ? `▌▌▌ ${escapeCinta(sub, 30)}` : null
  ].filter(Boolean).join('\n');
}

export function nombreLegible(nombre, numero) {
  const texto = String(nombre || '').trim();
  if (!texto) return '';
  if (texto.replace(/\D/g, '') === String(numero || '').replace(/\D/g, '')) return '';
  return texto;
}

export function titulo(principal, sub) {
  return [
    `> ▌▌ ${principal}`,
    sub ? `> ${sub}` : null
  ].filter(Boolean).join('\n');
}

export function pie(nota) {
  return nota ? `> ${nota}` : '> fin del registro';
}

export function fila(indice, contenido) {
  return `> ${String(indice).padStart(2, '0')} ▸ ${contenido}`;
}

export function campo(etiqueta, valor) {
  return `> ${etiqueta.padEnd(16, ' ')}: ${valor}`;
}

export function escapeCinta(texto, max = 60) {
  const limpio = String(texto || '').replace(/\s+/g, ' ').trim();
  if (limpio.length <= max) return limpio;
  return limpio.slice(0, max - 1) + '…';
}

export function mensajeKickban({ numero, nombre, motivo, autor, autorNombre, fechaTexto, veces, comandoUnban }) {
  const reingresos = veces > 1 ? `\n♻️ *reingresos bloqueados:* ${veces - 1}` : '';
  const autorTag = autor ? `@${String(autor).replace('@', '')}` : (autorNombre || 'desconocido');
  const autorExtra = autor && autorNombre ? ` _(${escapeCinta(autorNombre, 24)})_` : '';
  const etiqueta = nombreLegible(nombre, numero);
  return `${cabecera('🚨', 'EXPULSIÓN PERMANENTE', numero)}

👤 *@${numero}*${etiqueta ? `\n🏷️ _${escapeCinta(etiqueta, 30)}_` : ''}
📱 \`${numero}\`
📝 *motivo:* ${escapeCinta(motivo, 120)}
👮 *lo tiró:* ${autorTag}${autorExtra} · 🗓️ ${fechaTexto}${reingresos}

_🔒 quedó vetado de este grupo. Si vuelve a entrar, lo saco de nuevo._
⚠️ _si te equivocaste: ${comandoUnban} ${numero}_`;
}

export function avisoPermabanFallido({ numero, nombre, motivo, comandoUnban }) {
  const etiqueta = nombreLegible(nombre, numero);
  return `${cabecera('⚠️', 'REINGRESO BLOQUEADO', numero)}

👤 *@${numero}*${etiqueta ? `\n🏷️ _${escapeCinta(etiqueta, 30)}_` : ''}
📝 *motivo:* ${escapeCinta(motivo, 100)}
😵 *WhatsApp no me dejó expulsarlo esta vez*

_🔒 sigue vetado, la próxima entra y sale._
⚠️ _si fue un error: ${comandoUnban} ${numero}_`;
}

export function mensajeReingreso({ numero, nombre, motivo, veces, comandoUnban }) {
  const etiqueta = nombreLegible(nombre, numero);
  return `${cabecera('👻', 'REINGRESO BLOQUEADO', numero)}

👤 *@${numero}*${etiqueta ? `\n🏷️ _${escapeCinta(etiqueta, 30)}_` : ''}
📝 *motivo:* ${escapeCinta(motivo, 120)}
🔁 *intentos:* ${veces} ${veces === 1 ? 'vez' : 'veces'}

_🔒 sigue vetado de este grupo._
⚠️ _si fue un error: ${comandoUnban} ${numero}_`;
}

export function mensajeLista({ chatId, grupoNombre, entradas, comandoUnban, totalGrupos }) {
  if (!entradas.length) {
    return `${cabecera('🕶️', 'REGISTRO DE PERMABANEOS', grupoNombre)}

_✨ Nadie está vetado en este grupo todavía_
_(aprovechá antes de que se llene 🫠)_`;
  }

  const items = entradas.slice(0, 40).map((e, i) => {
    const reintentos = (e.veces || 1) > 1 ? `  ♻️${e.veces - 1}` : '';
    const etiqueta = nombreLegible(e.nombre, e.numero);
    return `${fila(i + 1, `👤 *${escapeCinta(etiqueta || e.numero, 24)}*${reintentos}`)}
   📱 \`${e.numero}\`
   📝 ${escapeCinta(e.motivo, 44)}`;
  });

  const restantes = entradas.length > items.length ? entradas.length - items.length : 0;
  const otros = totalGrupos > 1 ? `🌐 *otros grupos con registro:* ${totalGrupos - 1}\n` : '';

  return `${cabecera('🕶️', 'REGISTRO DE PERMABANEOS', grupoNombre)}

👥 *vetados:* ${entradas.length} persona(s)
${otros}▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌
${items.join('\n')}
${restantes ? `\n😈 _… y ${restantes} más_\n` : ''}▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌
🔓 _para levantar el veto:_ ${comandoUnban} <numero>`;
}

export function mensajeSinRegistro() {
  return `${cabecera('🕶️', 'REGISTRO DE PERMABANEOS', 'lista vacía')}

_✨ Nadie está vetado en este grupo todavía_
_(aprovechá antes de que se llene 🫠)_`;
}

export { registrarKickban };
