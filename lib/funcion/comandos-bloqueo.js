function nombresDe(plugin) {
  const h = plugin?.help;
  if (Array.isArray(h)) return h.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim());
  if (typeof h === 'string' && h.trim()) return [h.trim()];
  return [];
}
function tagsDe(plugin) {
  const t = plugin?.tags;
  if (Array.isArray(t)) return t.filter((x) => typeof x === 'string');
  if (typeof t === 'string' && t) return [t];
  return [];
}
export function construirCatalogo(plugins) {
  const out = [];
  for (const [archivo, plugin] of Object.entries(plugins || {})) {
    if (!plugin || plugin.disabled) continue;
    if (String(archivo).startsWith('custom-')) continue;
    const comandos = nombresDe(plugin);
    if (comandos.length === 0) continue;
    out.push({ archivo: String(archivo), comandos, tags: tagsDe(plugin) });
  }
  out.sort((a, b) => (a.comandos[0] || '').localeCompare(b.comandos[0] || ''));
  return out;
}
export function archivoDeComando(catalogo, nombre) {
  const n = String(nombre || '').trim().toLowerCase().replace(/^[./#!?+]/, '');
  if (!n) return null;
  for (const e of catalogo || []) {
    if (e.archivo.toLowerCase() === n || e.archivo.toLowerCase() === n + '.js') return e.archivo;
    if ((e.comandos || []).some((c) => String(c).toLowerCase() === n)) return e.archivo;
  }
  return null;
}
export function estaBloqueado(lista, archivo) {
  if (!Array.isArray(lista) || !archivo) return false;
  return lista.includes(archivo);
}
export function conmutarBloqueo(lista, archivo, apagar) {
  const base = Array.isArray(lista) ? lista.filter((x) => typeof x === 'string') : [];
  if (apagar) return base.includes(archivo) ? base : [...base, archivo];
  return base.filter((x) => x !== archivo);
}
