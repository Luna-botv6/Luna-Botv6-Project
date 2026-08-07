import fs from 'fs';
import path from 'path';

const MAX_ENTRIES = 30;
const LOG_PATH = path.join(process.cwd(), 'src/libraries/base/download-log.json');

function readEntriesFromDisk() {
  try {
    const parsed = JSON.parse(fs.readFileSync(LOG_PATH, 'utf8'));
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ENTRIES) : [];
  } catch {
    return [];
  }
}

function writeEntriesToDisk() {
  try {
    const dir = path.dirname(LOG_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive: true});
    const tmpPath = LOG_PATH + '.tmp';
    fs.writeFileSync(tmpPath, JSON.stringify(entries, null, 2));
    fs.renameSync(tmpPath, LOG_PATH);
  } catch {}
}

let entries = readEntriesFromDisk();

export function logDownloadEvent(data) {
  entries.unshift({ ...data, timestamp: Date.now() });
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
  writeEntriesToDisk();
}

export function getRecentDownloads() {
  return entries;
}
