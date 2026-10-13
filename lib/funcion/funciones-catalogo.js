export const FUNCIONES = [
  { id: 'welcome', storeKey: 'welcome', scope: 'group', perm: 'admin', subowner: true, categoria: 'bienvenida', panelGrupo: true, etiqueta: 'Bienvenida', defecto: true },
  { id: 'bye', storeKey: 'bye', scope: 'group', perm: 'admin', subowner: true, categoria: 'bienvenida', panelGrupo: true, etiqueta: 'Despedida', defecto: false },
  { id: 'detect', storeKey: 'detect', scope: 'group', perm: 'admin', subowner: true, categoria: 'deteccion', panelGrupo: true, etiqueta: 'Detección', defecto: false },
  { id: 'detect2', storeKey: 'detect2', scope: 'group', perm: 'admin', subowner: true, categoria: 'deteccion', panelGrupo: true, etiqueta: 'Detección (extra)', defecto: false },
  { id: 'antidelete', storeKey: 'antidelete', scope: 'group', perm: 'admin', subowner: true, categoria: 'moderacion', panelGrupo: true, etiqueta: 'Anti borrado', defecto: false },
  { id: 'antilink', storeKey: 'antiLink', scope: 'group', perm: 'admin', subowner: true, categoria: 'moderacion', panelGrupo: true, etiqueta: 'Anti link', defecto: false },
  { id: 'antilink2', storeKey: 'antiLink2', scope: 'group', perm: 'admin', subowner: true, categoria: 'moderacion', panelGrupo: true, etiqueta: 'Anti link (extra)', defecto: false },
  { id: 'modoadmin', storeKey: 'modoadmin', scope: 'group', perm: 'admin', subowner: true, categoria: 'moderacion', panelGrupo: true, etiqueta: 'Modo admin', defecto: false },
  { id: 'autosticker', storeKey: 'autosticker', scope: 'group', perm: 'admin', subowner: true, categoria: 'deteccion', panelGrupo: true, etiqueta: 'Auto sticker', defecto: false },
  { id: 'audios', storeKey: 'audios', scope: 'group', perm: 'admin', subowner: true, categoria: 'audios', panelGrupo: true, etiqueta: 'Audios en grupo', defecto: true },
  { id: 'agaudios', storeKey: 'agaudios', scope: 'group', perm: 'owner', subowner: true, categoria: 'audios', panelGrupo: false, etiqueta: 'Agregar audios', defecto: false },
  { id: 'antitoxic', storeKey: 'antiToxic', scope: 'group', perm: 'admin', subowner: true, categoria: 'moderacion', panelGrupo: true, etiqueta: 'Anti tóxico', defecto: false },
  { id: 'antiviewonce', storeKey: 'antiviewonce', scope: 'group', perm: 'admin', subowner: true, categoria: 'moderacion', panelGrupo: true, etiqueta: 'Anti view-once', defecto: false },
  { id: 'anti18', storeKey: 'anti18', scope: 'group', perm: 'admin', subowner: true, categoria: 'moderacion', panelGrupo: true, etiqueta: 'Anti +18', defecto: false },
  { id: 'antitag', storeKey: 'antitag', scope: 'group', perm: 'admin', subowner: true, categoria: 'moderacion', panelGrupo: true, etiqueta: 'Anti etiquetas', defecto: false },
  { id: 'afk', storeKey: 'afkAllowed', scope: 'group', perm: 'admin', subowner: true, categoria: 'deteccion', panelGrupo: true, etiqueta: 'AFK', defecto: true, permitePrivado: true },
  { id: 'inactivos', storeKey: 'inactivos', scope: 'group', perm: 'admin', subowner: true, categoria: 'deteccion', panelGrupo: true, etiqueta: 'Anti inactivos', defecto: false },
  { id: 'ia', storeKey: 'ia', scope: 'group', perm: 'admin', subowner: true, categoria: 'ia', panelGrupo: true, etiqueta: 'IA Luna', defecto: true, permitePrivado: true },
  { id: 'juegos', storeKey: 'juegos', scope: 'group', perm: 'admin', subowner: true, categoria: 'juegos', panelGrupo: true, etiqueta: 'Juegos', defecto: true, permitePrivado: true },
  { id: 'rpg', storeKey: 'rpg', scope: 'group', perm: 'admin', subowner: true, categoria: 'juegos', panelGrupo: true, etiqueta: 'RPG y economía', defecto: true, permitePrivado: true },
  { id: 'antimencion', storeKey: 'antimencion', scope: 'group', perm: 'admin', subowner: true, categoria: 'juegos', panelGrupo: true, etiqueta: 'Anti menciones masivas', defecto: false, permitePrivado: true },
  { id: 'restrict', storeKey: 'restrict', scope: 'bot', perm: 'owner', subowner: false, categoria: 'global', panelGrupo: false, etiqueta: 'Modo restringido', defecto: false },
  { id: 'audios_bot', storeKey: 'audios_bot', scope: 'bot', perm: 'owner', subowner: false, categoria: 'audios', panelGrupo: false, etiqueta: 'Audios del bot', defecto: false },
  { id: 'autoread', storeKey: 'autoread2', scope: 'bot', perm: 'owner', subowner: false, categoria: 'global', panelGrupo: false, etiqueta: 'Auto-leer mensajes', defecto: false },
  { id: 'anticall', storeKey: 'antiCall', scope: 'bot', perm: 'owner', subowner: false, categoria: 'global', panelGrupo: false, etiqueta: 'Anti llamadas', defecto: false },
  { id: 'antispam', storeKey: 'antispam', scope: 'bot', perm: 'owner', subowner: false, categoria: 'global', panelGrupo: false, etiqueta: 'Anti spam', defecto: false },
  { id: 'antiprivado', storeKey: 'antiprivado', scope: 'file', perm: 'owner', subowner: false, categoria: 'global', panelGrupo: false, etiqueta: 'Anti privado', defecto: false },
  { id: 'modopublico', storeKey: 'modopublico', scope: 'file', perm: 'owner', subowner: false, categoria: 'global', panelGrupo: false, etiqueta: 'Modo público', defecto: true },
  { id: 'vierwimage', storeKey: 'vierwimage', scope: 'file', perm: 'owner', subowner: false, categoria: 'global', panelGrupo: false, etiqueta: 'Ver view-once automático', defecto: false },
  { id: 'modogrupos', storeKey: 'modogrupos', scope: 'file', perm: 'owner', subowner: false, categoria: 'global', panelGrupo: false, etiqueta: 'Solo grupos', defecto: false }
];
export const LEGACY_CHAT_KEYS = ['sWelcome', 'sBye', 'simi', 'antiporno', 'delete', 'modohorny', 'antiTraba', 'antiArab', 'antiArab2', 'game', 'inactivosHoras', 'inactivosPor'];
export function mapaConfig() {
  const out = {};
  for (const f of FUNCIONES) {
    const e = { key: f.storeKey };
    if (f.scope === 'group') e.group = true;
    if (f.scope === 'bot') e.bot = true;
    if (f.scope === 'file') e.file = true;
    if (f.perm === 'admin') e.admin = true;
    if (f.perm === 'owner') e.owner = true;
    out[f.id] = e;
  }
  return out;
}
export function setSubowner() {
  return new Set(FUNCIONES.filter((f) => f.subowner).map((f) => f.id));
}
export function mapaPanelGrupo() {
  const out = {};
  for (const f of FUNCIONES.filter((f) => f.panelGrupo)) out[f.storeKey] = f.etiqueta;
  return out;
}
export function porId(id) {
  return FUNCIONES.find((f) => f.id === id) || null;
}
export function porStoreKey(storeKey) {
  return FUNCIONES.find((f) => f.storeKey === storeKey) || null;
}
export function puedeEnPrivado(id) {
  return porId(id)?.permitePrivado === true;
}
