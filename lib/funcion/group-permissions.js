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

export function isGroupDownloadEnabled(jid) {
  const data = readPermissions();
  if (!(jid in data)) return true;
  return !!data[jid];
}

export function setGroupDownloadEnabled(jid, enabled) {
  const data = readPermissions();
  data[jid] = !!enabled;
  writePermissions(data);
}

export function getAllPermissions() {
  return readPermissions();
}
