import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'src/libraries/base/panel-identity.json');

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadLocal() {
  if (!fs.existsSync(DATA_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function saveLocalAtomic(data) {
  ensureDataDir();
  const tmpFile = DATA_FILE + '.tmp';
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2));
  fs.renameSync(tmpFile, DATA_FILE);
}

let cached = null;
let pending = null;

export function ensureBotIdentity(centralHttpUrl) {
  if (cached) return Promise.resolve(cached);
  if (pending) return pending;

  const local = loadLocal();
  if (local?.botId && local?.secret) {
    cached = local;
    return Promise.resolve(cached);
  }

  pending = (async () => {
    const resp = await fetch(`${centralHttpUrl}/bot/register`, {method: 'POST'});
    const data = await resp.json();
    if (!data.ok) throw new Error('No se pudo registrar en el panel central.');
    const identity = {botId: data.botId, secret: data.secret};
    saveLocalAtomic(identity);
    cached = identity;
    return identity;
  })();

  return pending;
}
