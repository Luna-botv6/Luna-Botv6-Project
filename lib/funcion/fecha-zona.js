export const ZONAS = [
  { zona: 'America/Argentina/Buenos_Aires', nombre: 'Argentina (Buenos Aires)', corto: 'Argentina' },
  { zona: 'America/Mexico_City', nombre: 'México (Ciudad de México)', corto: 'México' },
  { zona: 'America/Bogota', nombre: 'Colombia (Bogotá)', corto: 'Colombia' },
  { zona: 'America/Santiago', nombre: 'Chile (Santiago)', corto: 'Chile' },
  { zona: 'America/Lima', nombre: 'Perú (Lima)', corto: 'Perú' },
  { zona: 'America/Caracas', nombre: 'Venezuela (Caracas)', corto: 'Venezuela' },
  { zona: 'America/Guayaquil', nombre: 'Ecuador (Guayaquil)', corto: 'Ecuador' },
  { zona: 'America/La_Paz', nombre: 'Bolivia (La Paz)', corto: 'Bolivia' },
  { zona: 'America/Asuncion', nombre: 'Paraguay (Asunción)', corto: 'Paraguay' },
  { zona: 'America/Montevideo', nombre: 'Uruguay (Montevideo)', corto: 'Uruguay' },
  { zona: 'America/Sao_Paulo', nombre: 'Brasil (São Paulo)', corto: 'Brasil' },
  { zona: 'America/New_York', nombre: 'Estados Unidos (Nueva York)', corto: 'EE. UU. Este' },
  { zona: 'Europe/Madrid', nombre: 'España (Madrid)', corto: 'España' },
  { zona: 'UTC', nombre: 'UTC (hora universal)', corto: 'UTC' }
];

const FORMATO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/;

export function zonaPorNombre(zona) {
  return ZONAS.find((z) => z.zona === zona) || null;
}

export function zonaValida(zona) {
  if (!zona) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: String(zona) }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function fechaLocalValida(valor) {
  return FORMATO_UTC.test(String(valor || ''));
}

function partesEnZona(ms, zona) {
  const formato = new Intl.DateTimeFormat('en-US', {
    timeZone: zona,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  const partes = {};
  for (const p of formato.formatToParts(new Date(ms))) partes[p.type] = p.value;
  return {
    year: Number(partes.year),
    month: Number(partes.month),
    day: Number(partes.day),
    hour: Number(partes.hour) % 24,
    minute: Number(partes.minute),
    second: Number(partes.second)
  };
}

function desfaseEnZona(ms, zona) {
  const p = partesEnZona(ms, zona);
  const comoUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return comoUtc - ms;
}

export function epochDesdeLocal(fechaLocal, zona) {
  if (!fechaLocalValida(fechaLocal)) return null;
  if (!zonaValida(zona)) return null;
  const [fecha, hora] = String(fechaLocal).split('T');
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const [horas, minutos] = hora.split(':').map(Number);
  if (!anio || !mes || !dia) return null;
  const base = Date.UTC(anio, mes - 1, dia, horas, minutos, 0);
  let desfase = desfaseEnZona(base, zona);
  let ms = base - desfase;
  const desfaseFinal = desfaseEnZona(ms, zona);
  if (desfaseFinal !== desfase) {
    desfase = desfaseFinal;
    ms = base - desfase;
  }
  return Number.isFinite(ms) ? ms : null;
}

export function localDesdeEpoch(ms, zona) {
  if (!Number.isFinite(ms) || !zonaValida(zona)) return '';
  const p = partesEnZona(ms, zona);
  const dos = (n) => String(n).padStart(2, '0');
  return p.year + '-' + dos(p.month) + '-' + dos(p.day) + 'T' + dos(p.hour) + ':' + dos(p.minute);
}

export function horaEnZona(ms, zona) {
  if (!Number.isFinite(ms) || !zonaValida(zona)) return '';
  try {
    return new Intl.DateTimeFormat('es-AR', {
      timeZone: zona,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).format(new Date(ms));
  } catch {
    return '';
  }
}

export function formatearEnZona(ms, zona) {
  if (!Number.isFinite(ms) || !zonaValida(zona)) return '';
  try {
    return new Intl.DateTimeFormat('es-AR', {
      timeZone: zona,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).format(new Date(ms));
  } catch {
    return '';
  }
}

export function etiquetaZona(zona) {
  const conocida = zonaPorNombre(zona);
  if (conocida) return conocida.nombre;
  return String(zona || 'UTC');
}
