import { resolveJidToPhone } from './lid-resolver.js';

function digitos(jid) {
  return String(jid || '').split('@')[0].replace(/\D/g, '');
}

function telefonoDe(jid, conn) {
  try {
    const tel = resolveJidToPhone(jid, conn);
    if (tel) return String(tel).replace(/\D/g, '');
  } catch {}
  return '';
}

export function resolverUsuarioObjetivo(conn, entrada) {
  const menciones = entrada?.mentionedJid || [];
  if (Array.isArray(menciones) && menciones.length > 0) {
    const cruda = menciones[0];
    let decodificada = cruda;
    try { decodificada = conn.decodeJid(cruda); } catch {}
    const tel = telefonoDe(decodificada, conn) || telefonoDe(cruda, conn);
    const numero = tel || digitos(decodificada);
    if (!numero) return { error: 'invalido' };
    return {
      numero,
      jid: tel ? tel + '@s.whatsapp.net' : String(decodificada),
      mention: String(cruda),
      candidatos: [...new Set([
        String(decodificada),
        tel ? tel + '@s.whatsapp.net' : null,
        tel ? tel + '@lid' : null,
        tel ? tel + '@c.us' : null
      ].filter(Boolean))]
    };
  }
  const texto = entrada?.text || '';
  if (texto) {
    const grupos = texto.match(/\d+/g);
    if (grupos) {
      const numero = grupos.join('');
      if (numero.length >= 10) {
        return {
          numero,
          jid: numero + '@s.whatsapp.net',
          mention: numero + '@s.whatsapp.net',
          candidatos: [numero + '@s.whatsapp.net', numero + '@lid', numero + '@c.us']
        };
      }
      return { error: 'invalido' };
    }
  }
  const citado = entrada?.quotedSender;
  if (citado) {
    let decodificado = citado;
    try { decodificado = conn.decodeJid(citado); } catch {}
    const tel = telefonoDe(decodificado, conn) || telefonoDe(citado, conn);
    const numero = tel || digitos(decodificado);
    if (!numero) return { error: 'invalido' };
    return {
      numero,
      jid: tel ? tel + '@s.whatsapp.net' : String(decodificado),
      mention: String(citado),
      candidatos: [...new Set([
        String(decodificado),
        tel ? tel + '@s.whatsapp.net' : null,
        tel ? tel + '@lid' : null
      ].filter(Boolean))]
    };
  }
  return { error: 'falta' };
}

export function normalizarRemitente(senderA, senderB) {
  const a = digitos(senderA);
  const b = digitos(senderB);
  return !!a && a === b;
}
