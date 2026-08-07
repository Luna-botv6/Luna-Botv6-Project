import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const AUTH_PATH = path.join(process.cwd(), 'src/libraries/base/panel-auth.json');

function readAuth() {
  try {
    return JSON.parse(fs.readFileSync(AUTH_PATH, 'utf8'));
  } catch {
    return null;
  }
}

function writeAuth(data) {
  const tmpPath = AUTH_PATH + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2));
  fs.renameSync(tmpPath, AUTH_PATH);
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

export function isRegistered() {
  return !!readAuth();
}

export function getUsername() {
  const auth = readAuth();
  return auth ? auth.username : null;
}

export function saveCredentials(username, password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashPassword(password, salt);
  writeAuth({username, salt, passwordHash, createdAt: Date.now()});
}

export function verifyCredentials(username, password) {
  const auth = readAuth();
  if (!auth || !username || !password) return false;
  if (auth.username !== username) return false;
  const hash = hashPassword(password, auth.salt);
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(auth.passwordHash, 'hex'));
  } catch {
    return false;
  }
}

export function resetCredentials() {
  try {
    fs.unlinkSync(AUTH_PATH);
  } catch {}
}
