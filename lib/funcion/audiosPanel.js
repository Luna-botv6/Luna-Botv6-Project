export const SUBIDA_MAX_BYTES = 3 * 1024 * 1024;
export const FRASE_MAX = 80;

export function ordenarEntradas(audios) {
  return Object.entries(audios || {}).sort((a, b) => {
    const na = (a[1] && a[1].original) || a[0];
    const nb = (b[1] && b[1].original) || b[0];
    return na.localeCompare(nb);
  });
}

export function parseIndicesPanel(raw, max) {
  if (typeof raw !== 'string') return null;
  const elegidos = new Set();
  const tokens = raw.split(/[\s,;]+/).filter(Boolean);
  if (tokens.length === 0) return null;
  for (const tk of tokens) {
    const rango = tk.match(/^(\d+)-(\d+)$/);
    if (rango) {
      let a = parseInt(rango[1], 10);
      let b = parseInt(rango[2], 10);
      if (Number.isNaN(a) || Number.isNaN(b)) return null;
      if (a > b) [a, b] = [b, a];
      if (a < 1 || b > max) return null;
      for (let n = a; n <= b; n++) elegidos.add(n);
      continue;
    }
    if (!/^\d+$/.test(tk)) return null;
    const n = parseInt(tk, 10);
    if (n < 1 || n > max) return null;
    elegidos.add(n);
  }
  return [...elegidos].sort((x, y) => x - y);
}

export function normalizarFrasePanel(frase) {
  const limpia = String(frase || '').trim().replace(/\s+/g, ' ');
  if (!limpia) return { ok: false, error: 'Falta la frase que activa el audio.' };
  if (limpia.length > FRASE_MAX) return { ok: false, error: 'La frase no puede pasar los 80 caracteres.' };
  return { ok: true, frase: limpia };
}

export function validarSubidaPanel({ frase, audioBase64 }) {
  const f = normalizarFrasePanel(frase);
  if (!f.ok) return f;
  if (!audioBase64 || typeof audioBase64 !== 'string') return { ok: false, error: 'Falta el audio.' };
  const limpio = audioBase64.replace(/^data:audio\/\w+;base64,/, '');
  let bytes = 0;
  try {
    bytes = Buffer.byteLength(limpio, 'base64');
  } catch {
    return { ok: false, error: 'El audio llegó corrupto.' };
  }
  if (bytes === 0) return { ok: false, error: 'El audio llegó vacío.' };
  if (bytes > SUBIDA_MAX_BYTES) return { ok: false, error: 'El audio no puede pasar los 3 MB.' };
  let buffer = null;
  try {
    buffer = Buffer.from(limpio, 'base64');
  } catch {
    return { ok: false, error: 'El audio llegó corrupto.' };
  }
  return { ok: true, frase: f.frase, buffer };
}
