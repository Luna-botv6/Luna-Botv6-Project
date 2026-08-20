import fs from 'fs';
import path from 'path';

const RUTA_ARCHIVO = path.join(process.cwd(), 'database', 'custom-commands.json');

let cache = null;

function cargarCache() {
  if (cache) return cache;
  try {
    const contenido = fs.readFileSync(RUTA_ARCHIVO, 'utf-8');
    cache = JSON.parse(contenido);
  } catch {
    cache = { comandos: {} };
  }
  return cache;
}

function guardarCache(data) {
  cache = data;
  const dir = path.dirname(RUTA_ARCHIVO);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const rutaTmp = `${RUTA_ARCHIVO}.tmp`;
  fs.writeFileSync(rutaTmp, JSON.stringify(data, null, 2));
  fs.renameSync(rutaTmp, RUTA_ARCHIVO);
}

function guardar(nombre, sesion) {
  const data = cargarCache();
  data.comandos[nombre] = { ...sesion, actualizado: Date.now() };
  guardarCache(data);
  return data.comandos[nombre];
}

function obtener(nombre) {
  const data = cargarCache();
  return data.comandos[nombre] || null;
}

function eliminar(nombre) {
  const data = cargarCache();
  if (!data.comandos[nombre]) return false;
  delete data.comandos[nombre];
  guardarCache(data);
  return true;
}

function listar() {
  const data = cargarCache();
  return Object.entries(data.comandos).map(([nombre, v]) => ({ nombre, ...v }));
}

export const customCommandsStore = {
  guardar,
  obtener,
  eliminar,
  listar
};
