import fs from 'fs';
import path from 'path';

const PERMISSIONS_PATH = path.join(process.cwd(), 'src/libraries/base/custom-command-group-permissions.json');

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

export function puedeUsarComando(commandName, jid) {
  const data = readPermissions();
  const desactivados = data[commandName];
  if (!Array.isArray(desactivados)) return true;
  return !desactivados.includes(jid);
}

export function getGruposDesactivados(commandName) {
  const data = readPermissions();
  return Array.isArray(data[commandName]) ? data[commandName] : [];
}

export function setGrupoHabilitado(commandName, jid, enabled) {
  const data = readPermissions();
  const desactivados = Array.isArray(data[commandName]) ? data[commandName] : [];
  const yaEsta = desactivados.includes(jid);
  let actualizado;
  if (enabled) {
    actualizado = desactivados.filter((g) => g !== jid);
  } else if (!yaEsta) {
    actualizado = [...desactivados, jid];
  } else {
    actualizado = desactivados;
  }
  if (actualizado.length === 0) {
    delete data[commandName];
  } else {
    data[commandName] = actualizado;
  }
  writePermissions(data);
}

export function eliminarComando(commandName) {
  const data = readPermissions();
  if (commandName in data) {
    delete data[commandName];
    writePermissions(data);
  }
}
