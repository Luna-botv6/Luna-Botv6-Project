const PREFIJOS_JUEGOS = ['game-', 'fun-', 'adiv', 'juego', 'veo'];
const PREFIJOS_RPG = ['rpg-'];
const EXTRAS_JUEGOS = new Set(['pista4.js', 'rpcancion.js']);
const MENCIONES_MASIVAS = new Set(['rpg-niveles.js', 'fun-top.js', 'fun-tops.js', 'fun-formarpareja.js', 'fun-love.js', 'game-loteria.js', 'game-quini6.js', 'game-dinamica.js', 'game-dinamicayo.js']);
const TAGS_JUEGOS = new Set(['game', 'games', 'juegos', 'fun', 'aventura']);
const TAGS_RPG = new Set(['rpg', 'xp', 'econ', 'economia']);
const EXENTOS = new Set(['config-funciones.js', 'gc-infogroup.js', 'owner-toggleia.js']);
function nombreArchivo(name) {
  const base = String(name || '').split('/').pop();
  return base.endsWith('.js') ? base : base + '.js';
}
function tagsDe(plugin) {
  const t = plugin?.tags;
  if (Array.isArray(t)) return t;
  if (typeof t === 'string') return [t];
  return [];
}
export function esPluginJuego(name, plugin) {
  const base = nombreArchivo(name);
  if (EXENTOS.has(base)) return false;
  if (EXTRAS_JUEGOS.has(base)) return true;
  if (PREFIJOS_JUEGOS.some((p) => base.startsWith(p))) return true;
  return tagsDe(plugin).some((t) => TAGS_JUEGOS.has(String(t)));
}
export function esPluginRpg(name, plugin) {
  const base = nombreArchivo(name);
  if (EXENTOS.has(base)) return false;
  if (PREFIJOS_RPG.some((p) => base.startsWith(p))) return true;
  if (PREFIJOS_JUEGOS.some((p) => base.startsWith(p))) return false;
  return tagsDe(plugin).some((t) => TAGS_RPG.has(String(t)));
}
export function esMencionMasiva(name) {
  return MENCIONES_MASIVAS.has(nombreArchivo(name));
}
