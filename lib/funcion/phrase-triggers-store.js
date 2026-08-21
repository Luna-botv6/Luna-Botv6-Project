import fs from 'fs';
import path from 'path';

const RUTA_ARCHIVO = path.join(process.cwd(), 'database', 'phrase-triggers.json');

let cache = null;

function cargarCache() {
  if (cache) return cache;
  try {
    const contenido = fs.readFileSync(RUTA_ARCHIVO, 'utf-8');
    cache = JSON.parse(contenido);
  } catch {
    cache = { disparadores: {}, vistos: {} };
  }
  if (!cache.vistos) cache.vistos = {};
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

function generarId() {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 4; i++) {
    id += caracteres[Math.floor(Math.random() * caracteres.length)];
  }
  return id;
}

function crear(datos) {
  const data = cargarCache();
  let id = generarId();
  while (data.disparadores[id]) id = generarId();

  data.disparadores[id] = {
    nombre: datos.nombre,
    frases: datos.frases,
    mensajePrincipal: datos.mensajePrincipal,
    imagenPrincipalPath: datos.imagenPrincipalPath || null,
    imagenPrincipalName: datos.imagenPrincipalName || null,
    repetirDistinto: !!datos.repetirDistinto,
    mensajeSecundario: datos.repetirDistinto ? (datos.mensajeSecundario || '') : null,
    imagenSecundarioPath: datos.repetirDistinto ? (datos.imagenSecundarioPath || null) : null,
    imagenSecundarioName: datos.repetirDistinto ? (datos.imagenSecundarioName || null) : null,
    permiso: datos.permiso || 'todos',
    activo: true,
    creado: Date.now()
  };

  guardarCache(data);
  return { id, ...data.disparadores[id] };
}

function actualizar(id, datos) {
  const data = cargarCache();
  if (!data.disparadores[id]) return null;

  const previo = data.disparadores[id];
  const repetirDistinto = !!datos.repetirDistinto;

  data.disparadores[id] = {
    ...previo,
    nombre: datos.nombre,
    frases: datos.frases,
    mensajePrincipal: datos.mensajePrincipal,
    imagenPrincipalPath: datos.imagenPrincipalPath !== undefined ? datos.imagenPrincipalPath : previo.imagenPrincipalPath,
    imagenPrincipalName: datos.imagenPrincipalName !== undefined ? datos.imagenPrincipalName : previo.imagenPrincipalName,
    repetirDistinto,
    mensajeSecundario: repetirDistinto ? (datos.mensajeSecundario || '') : null,
    imagenSecundarioPath: repetirDistinto ? (datos.imagenSecundarioPath !== undefined ? datos.imagenSecundarioPath : previo.imagenSecundarioPath) : null,
    imagenSecundarioName: repetirDistinto ? (datos.imagenSecundarioName !== undefined ? datos.imagenSecundarioName : previo.imagenSecundarioName) : null,
    permiso: datos.permiso || 'todos'
  };

  if (previo.repetirDistinto && !repetirDistinto) {
    delete data.vistos[id];
  }

  guardarCache(data);
  return { id, ...data.disparadores[id] };
}

function obtener(id) {
  const data = cargarCache();
  if (!data.disparadores[id]) return null;
  return { id, ...data.disparadores[id] };
}

function listar() {
  const data = cargarCache();
  return Object.entries(data.disparadores).map(([id, v]) => ({ id, ...v }));
}

function listarActivos() {
  return listar().filter((d) => d.activo);
}

function togglePausa(id, activo) {
  const data = cargarCache();
  if (!data.disparadores[id]) return { ok: false, error: 'id_invalido' };
  data.disparadores[id].activo = activo;
  guardarCache(data);
  return { ok: true };
}

function eliminar(id) {
  const data = cargarCache();
  if (!data.disparadores[id]) return { ok: false, error: 'id_invalido' };
  delete data.disparadores[id];
  delete data.vistos[id];
  guardarCache(data);
  return { ok: true };
}

function yaVisto(id, chatId, userId) {
  const data = cargarCache();
  const clave = chatId + '_' + userId;
  return !!(data.vistos[id] && data.vistos[id][clave]);
}

function marcarVisto(id, chatId, userId) {
  const data = cargarCache();
  if (!data.vistos[id]) data.vistos[id] = {};
  const clave = chatId + '_' + userId;
  if (data.vistos[id][clave]) return;
  data.vistos[id][clave] = Date.now();
  guardarCache(data);
}

function resetearVistos(id) {
  const data = cargarCache();
  if (!data.disparadores[id]) return { ok: false, error: 'id_invalido' };
  const cantidad = data.vistos[id] ? Object.keys(data.vistos[id]).length : 0;
  delete data.vistos[id];
  guardarCache(data);
  return { ok: true, cantidad };
}

export const phraseTriggersStore = {
  crear,
  actualizar,
  obtener,
  listar,
  listarActivos,
  togglePausa,
  eliminar,
  yaVisto,
  marcarVisto,
  resetearVistos
};
