import { resolveJidToPhone } from './lid-resolver.js';

export function soloDigitos(valor) {
  return String(valor ?? '').split('@')[0].replace(/\D/g, '');
}

export function buscarParticipante(participants, raw, conn) {
  if (!raw) return null;
  const lista = Array.isArray(participants) ? participants : [];
  const texto = typeof raw === 'string' ? raw : (raw.id || raw.lid || raw.phoneNumber || '');
  if (!texto) return null;
  const digitos = soloDigitos(texto);

  const directo = lista.find(p =>
    p && (p.id === texto || p.lid === texto || p.phoneNumber === texto)
  );
  if (directo) return directo;

  if (digitos) {
    const porNumero = lista.find(p =>
      p && (soloDigitos(p.id) === digitos ||
        soloDigitos(p.lid) === digitos ||
        soloDigitos(p.phoneNumber) === digitos)
    );
    if (porNumero) return porNumero;

    try {
      const tel = resolveJidToPhone(texto, conn || global.conn);
      if (tel) {
        const porTelefono = lista.find(p =>
          p && (soloDigitos(p.id) === tel ||
            soloDigitos(p.lid) === tel ||
            soloDigitos(p.phoneNumber) === tel)
        );
        if (porTelefono) return porTelefono;
      }
    } catch {}
  }

  return null;
}

export function idMencion(participante, fallback) {
  if (participante?.id) return participante.id;
  if (participante?.phoneNumber) return participante.phoneNumber;
  if (participante?.lid) return participante.lid;
  return fallback || null;
}
