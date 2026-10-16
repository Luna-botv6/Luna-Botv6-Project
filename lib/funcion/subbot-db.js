import { Low, JSONFile } from 'lowdb';
import fs from 'fs';
import path from 'path';
import { ejecutarConScope, scopeActual } from './db-scope.js';

const dbs = new Map();

export function rutaDbSubbot(userId) {
  return path.join('./sub-lunabot/', userId, 'luna-db.json');
}

function baseVacia() {
  return { users: {}, chats: {}, stats: {}, msgs: {}, sticker: {}, settings: {}, config: {} };
}

export async function dbDelSubbot(userId) {
  if (dbs.has(userId)) return dbs.get(userId);
  const archivo = rutaDbSubbot(userId);
  const dir = path.dirname(archivo);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const db = new Low(new JSONFile(archivo));
  await db.read().catch(() => {});
  db.data = { ...baseVacia(), ...(db.data || {}) };
  dbs.set(userId, db);
  return db;
}

export function olvidarDbSubbot(userId) {
  dbs.delete(userId);
}

let instalado = false;

export function instalarScopeSubbot() {
  if (instalado || !global.db) return;
  instalado = true;
  const real = global.db;
  global.db = new Proxy(real, {
    get(t, p) {
      const s = scopeActual();
      if (s?.db) {
        if (p === 'data') return s.db.data;
        if (p === 'read') return s.db.read.bind(s.db);
        if (p === 'write') return s.db.write.bind(s.db);
      }
      const v = t[p];
      return typeof v === 'function' ? v.bind(t) : v;
    },
    set(t, p, v) {
      const s = scopeActual();
      if (s?.db && p === 'data') {
        s.db.data = v;
        return true;
      }
      t[p] = v;
      return true;
    }
  });
}

export async function conDbSubbot(userId, fn) {
  const db = await dbDelSubbot(userId);
  return ejecutarConScope({ userId, db }, fn);
}
