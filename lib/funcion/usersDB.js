import fs from 'fs';
import path from 'path';

const usersPath = path.resolve('./database/users.json');

if (!fs.existsSync(usersPath)) {
  fs.writeFileSync(usersPath, '{}');
}

let usersData = {};
let _savePending = false;
let _saveTimer = null;
const SAVE_DEBOUNCE_MS = 8000;

try {
  usersData = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
} catch (e) {
  console.error('Error leyendo users.json:', e);
  usersData = {};
}

function _flushUsers() {
  if (!_savePending) return;
  _savePending = false;
  _saveTimer = null;
  const tmp = usersPath + '.tmp';
  fs.writeFile(tmp, JSON.stringify(usersData), (err) => {
    if (err) {
      console.error('Error al guardar users.json:', err.message);
      return;
    }
    fs.rename(tmp, usersPath, (err2) => {
      if (err2) console.error('Error al renombrar users.json:', err2.message);
    });
  });
}

function scheduleSave(force = false) {
  _savePending = true;
  if (_saveTimer) clearTimeout(_saveTimer);
  if (force) { _flushUsers(); return; }
  _saveTimer = setTimeout(_flushUsers, SAVE_DEBOUNCE_MS);
}

process.on('exit', () => { if (_savePending) _flushUsers(); });
process.on('SIGINT', () => { if (_savePending) _flushUsers(); process.exit(); });
process.on('SIGTERM', () => { if (_savePending) _flushUsers(); process.exit(); });

function getUser(id) {
  return usersData[id] || {};
}

function setUser(id, data) {
  usersData[id] = { ...(usersData[id] || {}), ...data };
  scheduleSave();
}

function getAllUsers() {
  return usersData;
}

export { getUser, setUser, getAllUsers };
