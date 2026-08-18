import fs from 'fs';
import path from 'path';

const RUTA_ARCHIVO = path.join(process.cwd(), 'database', 'canal-relay.json');

let cache = null;

function cargarCache() {
  if (cache) return cache;
  try {
    const contenido = fs.readFileSync(RUTA_ARCHIVO, 'utf-8');
    cache = JSON.parse(contenido);
  } catch {
    cache = { vinculaciones: {} };
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

function generarCodigo() {
  const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo = '';
  for (let i = 0; i < 4; i++) {
    codigo += caracteres[Math.floor(Math.random() * caracteres.length)];
  }
  return codigo;
}

function crearPrincipal(jidPrincipal, nombre) {
  const data = cargarCache();

  for (const codigo in data.vinculaciones) {
    if (data.vinculaciones[codigo].principal === jidPrincipal) {
      return { ok: true, codigo, existente: true };
    }
  }

  let codigo = generarCodigo();
  while (data.vinculaciones[codigo]) {
    codigo = generarCodigo();
  }

  data.vinculaciones[codigo] = {
    principal: jidPrincipal,
    nombre: nombre || null,
    destinos: [],
    tipos: { texto: true, imagen: true, video: true, sticker: true, audio: true, encuesta: false },
    activo: true,
    creado: Date.now()
  };

  guardarCache(data);
  return { ok: true, codigo, existente: false };
}


function vincularDestino(codigo, jidDestino, nombre) {
  const data = cargarCache();
  const vinculacion = data.vinculaciones[codigo];

  if (!vinculacion) return { ok: false, error: 'codigo_invalido' };
  if (vinculacion.principal === jidDestino) return { ok: false, error: 'mismo_grupo' };
  if (vinculacion.destinos.includes(jidDestino)) return { ok: false, error: 'ya_vinculado' };

  vinculacion.destinos.push(jidDestino);
  if (nombre) {
    if (!vinculacion.nombresDestino) vinculacion.nombresDestino = {};
    vinculacion.nombresDestino[jidDestino] = nombre;
  }
  guardarCache(data);
  return { ok: true, principal: vinculacion.principal };
}

function desvincularDestino(jidDestino) {
  const data = cargarCache();
  let encontrado = false;

  for (const codigo in data.vinculaciones) {
    const vinculacion = data.vinculaciones[codigo];
    const indice = vinculacion.destinos.indexOf(jidDestino);
    if (indice !== -1) {
      vinculacion.destinos.splice(indice, 1);
      if (vinculacion.nombresDestino) delete vinculacion.nombresDestino[jidDestino];
      encontrado = true;
    }
  }

  if (encontrado) guardarCache(data);
  return { ok: encontrado };
}

function buscarPorPrincipal(jidPrincipal) {
  const data = cargarCache();
  for (const codigo in data.vinculaciones) {
    if (data.vinculaciones[codigo].principal === jidPrincipal) {
      return { codigo, ...data.vinculaciones[codigo] };
    }
  }
  return null;
}

function buscarPorDestino(jidDestino) {
  const data = cargarCache();
  for (const codigo in data.vinculaciones) {
    if (data.vinculaciones[codigo].destinos.includes(jidDestino)) {
      return { codigo, ...data.vinculaciones[codigo] };
    }
  }
  return null;
}

function buscarPorCodigo(codigo) {
  const data = cargarCache();
  const key = (codigo || '').toUpperCase();
  const vinculacion = data.vinculaciones[key];
  if (!vinculacion) return null;
  return { codigo: key, ...vinculacion };
}

function togglePausa(codigo, activo) {
  const data = cargarCache();
  const vinculacion = data.vinculaciones[codigo];
  if (!vinculacion) return { ok: false, error: 'codigo_invalido' };
  vinculacion.activo = activo;
  guardarCache(data);
  return { ok: true };
}

function toggleTipo(codigo, tipo, valor) {
  const data = cargarCache();
  const vinculacion = data.vinculaciones[codigo];
  if (!vinculacion) return { ok: false, error: 'codigo_invalido' };
  if (!(tipo in vinculacion.tipos)) return { ok: false, error: 'tipo_invalido' };
  vinculacion.tipos[tipo] = valor;
  guardarCache(data);
  return { ok: true };
}

function eliminarVinculacion(codigo) {
  const data = cargarCache();
  if (!data.vinculaciones[codigo]) return { ok: false, error: 'codigo_invalido' };
  delete data.vinculaciones[codigo];
  guardarCache(data);
  return { ok: true };
}

function listarTodas() {
  const data = cargarCache();
  return Object.entries(data.vinculaciones).map(([codigo, v]) => ({ codigo, ...v }));
}

export const canalStore = {
  crearPrincipal,
  vincularDestino,
  desvincularDestino,
  buscarPorPrincipal,
  buscarPorDestino,
  buscarPorCodigo,
  togglePausa,
  toggleTipo,
  eliminarVinculacion,
  listarTodas
};
