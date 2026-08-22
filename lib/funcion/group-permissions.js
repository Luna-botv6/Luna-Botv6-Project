import fs from 'fs';
import path from 'path';

const PERMISSIONS_PATH = path.join(process.cwd(), 'src/libraries/base/group-permissions.json');

function readPermissions() {
  try {
    return JSON.parse(fs.readFileSync(PERMISSIONS_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writePermissions(data) {
  const tmpPath = PERMISSIONS_PATH + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
  fs.renameSync(tmpPath, PERMISSIONS_PATH);
}

function normalizarEntry(valor) {
  if (typeof valor === 'boolean') {
    return { enabled: valor, limiteDiario: null, contador: { fecha: null, cantidad: 0 } };
  }
  if (valor && typeof valor === 'object') {
    return {
      enabled: valor.enabled !== undefined ? !!valor.enabled : true,
      limiteDiario: typeof valor.limiteDiario === 'number' ? valor.limiteDiario : null,
      contador: valor.contador && typeof valor.contador === 'object'
        ? { fecha: valor.contador.fecha || null, cantidad: valor.contador.cantidad || 0 }
        : { fecha: null, cantidad: 0 }
    };
  }
  return { enabled: true, limiteDiario: null, contador: { fecha: null, cantidad: 0 } };
}

function hoyString() {
  return new Date().toISOString().slice(0, 10);
}

export function isGroupDownloadEnabled(jid) {
  const data = readPermissions();
  if (!(jid in data)) return true;
  return normalizarEntry(data[jid]).enabled;
}

export function setGroupDownloadEnabled(jid, enabled) {
  const data = readPermissions();
  const entry = normalizarEntry(data[jid]);
  entry.enabled = !!enabled;
  data[jid] = entry;
  writePermissions(data);
}

export function getGroupDailyLimit(jid) {
  const data = readPermissions();
  return normalizarEntry(data[jid]).limiteDiario;
}

export function setGroupDailyLimit(jid, limite) {
  const data = readPermissions();
  const entry = normalizarEntry(data[jid]);
  entry.limiteDiario = (limite === null || limite === undefined || limite === '')
    ? null
    : Math.max(0, parseInt(limite, 10) || 0);
  data[jid] = entry;
  writePermissions(data);
}

export function puedeDescargar(jid) {
  const data = readPermissions();
  const entry = normalizarEntry(data[jid]);
  if (entry.limiteDiario === null) return { ok: true, restantes: null, limite: null };

  const hoy = hoyString();
  const usadasHoy = entry.contador.fecha === hoy ? entry.contador.cantidad : 0;
  const restantes = entry.limiteDiario - usadasHoy;
  return { ok: restantes > 0, restantes: Math.max(0, restantes), limite: entry.limiteDiario };
}

export function registrarDescargaExitosa(jid) {
  const data = readPermissions();
  const entry = normalizarEntry(data[jid]);
  const hoy = hoyString();

  if (entry.contador.fecha !== hoy) {
    entry.contador = { fecha: hoy, cantidad: 0 };
  }
  entry.contador.cantidad += 1;
  data[jid] = entry;
  writePermissions(data);
}

export function getAllPermissions() {
  const data = readPermissions();
  const normalizado = {};
  for (const jid in data) normalizado[jid] = normalizarEntry(data[jid]);
  return normalizado;
}
