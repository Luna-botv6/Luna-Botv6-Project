import { access, mkdir } from 'fs/promises';

const MENU_DIR = './database/WELCOME';
const SUBBOTS_DIR = `${MENU_DIR}/subbots`;
const DEFAULT_VID_ES = './src/assets/images/menu/languages/es/VID-20250527-WA0006.mp4';

export function subbotIdFor(conn) {
  if (!conn?.isSubBot) return '';
  const fromUserId = String(conn?.userId || '').replace(/[^0-9]/g, '');
  if (fromUserId) return fromUserId;
  return String(conn?.user?.jid || '').split('@')[0].replace(/[^0-9]/g, '');
}

export function menuDirFor(conn) {
  const id = subbotIdFor(conn);
  return id ? `${SUBBOTS_DIR}/${id}` : MENU_DIR;
}

export function menuPathsFor(conn) {
  const dir = menuDirFor(conn);
  return { dir, img: `${dir}/menu_image.jpg`, vid: `${dir}/menu_video.mp4` };
}

export async function fileExists(p) {
  try { await access(p); return true; } catch { return false; }
}

export async function ensureMenuDir(conn) {
  const { dir } = menuPathsFor(conn);
  try { await mkdir(dir, { recursive: true }); } catch {}
  return dir;
}

export async function resolveMenuMedia(conn, idioma = 'es', prioridad = 'video') {
  const { img, vid } = menuPathsFor(conn);
  const primero = prioridad === 'imagen' ? img : vid;
  const segundo = prioridad === 'imagen' ? vid : img;

  if (await fileExists(primero)) {
    return { path: primero, type: prioridad === 'imagen' ? 'image' : 'video' };
  }
  if (await fileExists(segundo)) {
    return { path: segundo, type: prioridad === 'imagen' ? 'video' : 'image' };
  }

  const lang = String(idioma || 'es');
  const langPath = `./src/assets/images/menu/languages/${lang}/VID-20250527-WA0006.mp4`;
  if (lang !== 'es' && await fileExists(langPath)) return { path: langPath, type: 'video' };
  return { path: DEFAULT_VID_ES, type: 'video' };
}

export async function resolveMenuImage(conn, idioma = 'es') {
  const { img } = menuPathsFor(conn);
  if (await fileExists(img)) return img;
  const lang = String(idioma || 'es');
  const langImg = `./src/assets/images/menu/languages/${lang}/menu.png`;
  if (await fileExists(langImg)) return langImg;
  return null;
}
