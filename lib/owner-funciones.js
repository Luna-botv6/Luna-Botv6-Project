import fs from 'fs';
import path from 'path';

const dbDir = path.join('./database');
const dbPath = path.join(dbDir, 'funciones-owner.json');

const defaultData = {
  auread: false,
  modopublico: true,
  vierwimage: false,
  antiprivado: false,
  modogrupos: false
};

function ensureDB() {
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir);
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(defaultData, null, 2));
  }
}

function readDB() {
  ensureDB();
  return JSON.parse(fs.readFileSync(dbPath));
}

function writeDB(data) {
  ensureDB();
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

export function getOwnerFunction() {
  return readDB();
}

export function setOwnerFunction(key, value) {
  const data = readDB();
  if (key in defaultData) {
    data[key] = value;
    writeDB(data);
    return true;
  }
  return false;
}

export function enableFunction(key) {
  return setOwnerFunction(key, true);
}

export function disableFunction(key) {
  return setOwnerFunction(key, false);
}

export function isFunctionEnabled(key) {
  const data = readDB();
  return data[key] === true;
}

export function getValidKeys() {
  return Object.keys(defaultData);
}