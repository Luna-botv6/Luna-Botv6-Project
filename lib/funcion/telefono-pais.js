export const PAISES = [
  { codigo: 'AR', nombre: 'Argentina', lada: '54', movil: '549', digitos: 10, ejemplo: '11 2345-6789' },
  { codigo: 'MX', nombre: 'México', lada: '52', movil: '521', digitos: 10, ejemplo: '55 1234 5678' },
  { codigo: 'CO', nombre: 'Colombia', lada: '57', movil: '57', digitos: 10, ejemplo: '300 123 4567' },
  { codigo: 'CL', nombre: 'Chile', lada: '56', movil: '56', digitos: 9, ejemplo: '9 1234 5678' },
  { codigo: 'PE', nombre: 'Perú', lada: '51', movil: '51', digitos: 9, ejemplo: '912 345 678' },
  { codigo: 'VE', nombre: 'Venezuela', lada: '58', movil: '58', digitos: 10, ejemplo: '412 123 4567' },
  { codigo: 'EC', nombre: 'Ecuador', lada: '593', movil: '593', digitos: 9, ejemplo: '99 123 4567' },
  { codigo: 'BO', nombre: 'Bolivia', lada: '591', movil: '591', digitos: 8, ejemplo: '71234567' },
  { codigo: 'PY', nombre: 'Paraguay', lada: '595', movil: '595', digitos: 9, ejemplo: '981 123 456' },
  { codigo: 'UY', nombre: 'Uruguay', lada: '598', movil: '598', digitos: 8, ejemplo: '94 123 456' },
  { codigo: 'BR', nombre: 'Brasil', lada: '55', movil: '55', digitos: 11, ejemplo: '11 91234-5678' },
  { codigo: 'ES', nombre: 'España', lada: '34', movil: '34', digitos: 9, ejemplo: '612 345 678' },
  { codigo: 'US', nombre: 'Estados Unidos / Canadá', lada: '1', movil: '1', digitos: 10, ejemplo: '305 123 4567' },
  { codigo: 'OTRO', nombre: 'Otro país (escribí el número completo con su código)', lada: '', movil: '', digitos: 0, ejemplo: '34 612345678' }
];

const ORDEN_LADAS = PAISES.filter((p) => p.lada).sort((a, b) => b.lada.length - a.lada.length);

function soloDigitos(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}

function limpiarPrefijosNacionales(digitos) {
  return String(digitos || '').replace(/^0+/, '');
}

function formaDelPais(digitos, pais) {
  if (!pais || !pais.lada) return false;
  const movil = pais.movil || pais.lada;
  if (digitos.length === movil.length + pais.digitos && digitos.startsWith(movil)) return true;
  if (digitos.length === pais.lada.length + pais.digitos && digitos.startsWith(pais.lada)) return true;
  return false;
}

export function paisPorCodigo(codigo) {
  const buscado = String(codigo || '').trim().toUpperCase();
  return PAISES.find((p) => p.codigo === buscado) || null;
}

export function paisPorLada(digitos) {
  const numero = soloDigitos(digitos);
  if (!numero) return null;
  return ORDEN_LADAS.find((p) => numero.startsWith(p.lada)) || null;
}

function construir(digitos, pais) {
  const numero = limpiarPrefijosNacionales(digitos);
  const lada = pais.lada;
  const movil = pais.movil || pais.lada;
  const local = pais.digitos;
  let nota = '';
  let final = numero;

  if (!lada) return { error: 'Elegí un país o escribí el número con su código de país (por ejemplo +34 612345678).' };

  if (numero.length === movil.length + local && numero.startsWith(movil)) {
    final = numero;
  } else if (numero.length === lada.length + local && numero.startsWith(lada)) {
    final = movil + numero.slice(lada.length);
    if (movil !== lada) {
      nota = 'Se agregó el prefijo móvil de ' + pais.nombre + ' (' + lada + ' → ' + movil + ').';
    }
  } else if (numero.length === local) {
    final = movil + numero;
    nota = 'Se agregó el prefijo de ' + pais.nombre + ' (+' + movil + ').';
  } else if (numero.startsWith(movil) && movil !== lada) {
    final = numero;
  } else if (movil !== lada && numero.startsWith(lada)) {
    final = movil + numero.slice(lada.length);
    nota = 'Se agregó el prefijo móvil de ' + pais.nombre + ' (' + lada + ' → ' + movil + ').';
  } else {
    final = movil + numero;
    nota = 'Se agregó el prefijo de ' + pais.nombre + ' (+' + movil + ').';
  }

  if (!/^\d{8,15}$/.test(final)) {
    return { error: 'El número no parece válido. Revisá el código de país y la cantidad de dígitos.' };
  }

  return { numero: final, nota };
}

export function normalizarTelefono(entrada, codigoPais) {
  const crudo = String(entrada ?? '').trim();
  const digitos = soloDigitos(crudo);
  if (!digitos) return { ok: false, error: 'Escribí el número del destinatario.' };

  const conMas = crudo.startsWith('+');
  let pais = paisPorCodigo(codigoPais) || PAISES[0];

  if (conMas) {
    const detectado = paisPorLada(digitos);
    if (detectado) pais = detectado;
    const armado = construir(digitos, pais);
    if (armado.error) return { ok: false, error: armado.error };
    return {
      ok: true,
      numero: armado.numero,
      jid: armado.numero + '@s.whatsapp.net',
      pais: pais.codigo,
      nombrePais: pais.nombre,
      nota: armado.nota || ''
    };
  }

  if (pais.codigo === 'OTRO') {
    const detectado = paisPorLada(digitos);
    if (!detectado) {
      return { ok: false, error: 'No reconocí el código de país del número. Escribilo con + adelante (ejemplo +34 612345678).' };
    }
    pais = detectado;
  } else {
    const detectado = paisPorLada(digitos);
    if (detectado && detectado.codigo !== pais.codigo && formaDelPais(limpiarPrefijosNacionales(digitos), detectado)) {
      pais = detectado;
    }
  }

  const armado = construir(digitos, pais);
  if (armado.error) return { ok: false, error: armado.error };

  return {
    ok: true,
    numero: armado.numero,
    jid: armado.numero + '@s.whatsapp.net',
    pais: pais.codigo,
    nombrePais: pais.nombre,
    nota: armado.nota || ''
  };
}

export function formatearTelefono(numero) {
  const digitos = soloDigitos(numero);
  return digitos ? '+' + digitos : '';
}

export function opcionesPais() {
  return PAISES.map((p) => ({ codigo: p.codigo, nombre: p.nombre, ejemplo: p.ejemplo }));
}
