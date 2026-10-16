import fs from 'fs';
import path from 'path';

const BLOQUEADOS = new Set([
  'miserver', 'milink', 'reg', 'password', 'resetserver',
  'actualizacion', 'actualizaciones', 'update', 'updates',
  'restart', 'reiniciar', 'reparar',
  'setprefix', 'resetprefix', 'sinprefijo', 'noprefix', 'conprefijo', 'withprefix',
  'setvar',
  'createfile', 'editfile', 'deletefile', 'listfiles', 'viewfile',
  'getplugin', 'gp', 'fetch', 'get',
  'hostinfo', 'debugip',
  'restaurar', 'backup', 'limpieza', 'cleartmp', 'cleartemp',
  'plg', 'agrg', 'cancel',
  'createcode', 'createadv', 'editcode', 'edit', 'edittag', 'editimage',
  'setmessage', 'setctag', 'setimage', 'uploadimage', 'setcommand', 'cancelcode'
]);

export function esSubbot(conn) {
  return !!conn?.isSubBot;
}

export function bloqueadoEnSubbot(command) {
  if (!command) return false;
  return BLOQUEADOS.has(String(command).toLowerCase());
}

export function textoBloqueoSubbot() {
  return '🔒 Ese comando es privado del bot principal y no se puede usar desde un SubBot.';
}

export function digitos(jid) {
  return String(jid || '').split('@')[0].replace(/[^0-9]/g, '');
}

export function idSubbotDe(conn) {
  const porCampo = String(conn?.userId || '').replace(/[^0-9]/g, '');
  if (porCampo) return porCampo;
  return digitos(conn?.user?.jid);
}

export function rutaIdentidad(userId) {
  return path.join('./sub-lunabot/', userId, 'identidad.json');
}

export function leerIdentidad(userId) {
  try {
    if (!userId) return null;
    const ruta = rutaIdentidad(userId);
    if (!fs.existsSync(ruta)) return null;
    return JSON.parse(fs.readFileSync(ruta, 'utf8'));
  } catch {
    return null;
  }
}

export function guardarIdentidad(userId, parche = {}) {
  const ruta = rutaIdentidad(userId);
  const dir = path.dirname(ruta);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const actual = leerIdentidad(userId) || {};
  const next = { ...actual, ...parche, actualizado: Date.now() };
  fs.writeFileSync(ruta, JSON.stringify(next, null, 2));
  return next;
}

export function esDuenoSubbot(m, conn) {
  if (!esSubbot(conn)) return false;
  if (m?.fromMe) return true;
  const dueno = leerIdentidad(idSubbotDe(conn))?.dueno;
  if (!dueno) return false;
  const a = digitos(dueno);
  const b = digitos(m?.sender);
  return !!a && a === b;
}

const RUTA_SISTEMA = './database/subbot-sistema.json';

export function sistemaActivo() {
  if (typeof global.subbotEnabled === 'boolean') return global.subbotEnabled;
  try {
    const d = JSON.parse(fs.readFileSync(RUTA_SISTEMA, 'utf8'));
    global.subbotEnabled = d.enabled !== false;
  } catch {
    global.subbotEnabled = true;
  }
  return global.subbotEnabled;
}

export function fijarSistema(on) {
  global.subbotEnabled = !!on;
  try {
    fs.writeFileSync(RUTA_SISTEMA, JSON.stringify({ enabled: !!on, cambio: Date.now() }));
  } catch {}
}
