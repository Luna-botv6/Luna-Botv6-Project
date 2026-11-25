import fs from 'fs';
import path from 'path';

const STORE = './database/filtros-globales.json';
const CACHE_MS = 2000;
const MAX_ENTRADAS = 500;

let _cache = { data: null, mtime: 0, checked: 0 };

function vacio() {
  return { activo: false, numeros: [], prefijos: [], permitidos: [] };
}

function soloDigitos(valor) {
  return String(valor ?? '').split('@')[0].replace(/\D/g, '');
}

function lectura(ruta) {
  const raw = fs.readFileSync(ruta, 'utf8').replace(/^\uFEFF/, '');
  const data = JSON.parse(raw);
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('formato invalido');
  return data;
}

function escribir(data) {
  const dir = path.dirname(STORE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = `${STORE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  try {
    if (fs.existsSync(STORE)) {
      lectura(STORE);
      fs.copyFileSync(STORE, `${STORE}.bak`);
    }
  } catch {}
  fs.renameSync(tmp, STORE);
  const st = fs.statSync(STORE);
  _cache = { data, mtime: st.mtimeMs, checked: Date.now() };
}

function cargar() {
  const ahora = Date.now();
  if (_cache.data && ahora - _cache.checked < CACHE_MS) return _cache.data;
  _cache.checked = ahora;
  try {
    const st = fs.statSync(STORE);
    if (!_cache.data || st.mtimeMs !== _cache.mtime) {
      try {
        _cache.data = lectura(STORE);
      } catch {
        try {
          _cache.data = lectura(`${STORE}.bak`);
        } catch {
          _cache.data = vacio();
        }
      }
      _cache.mtime = st.mtimeMs;
    }
  } catch {
    if (!_cache.data) {
      try {
        _cache.data = lectura(`${STORE}.bak`);
      } catch {
        _cache.data = vacio();
      }
      _cache.mtime = 0;
    }
  }
  return _cache.data;
}

function normalizarEntradas(valores, { permitirPrefijos = true } = {}) {
  const numeros = new Set();
  const prefijos = new Set();
  const lista = Array.isArray(valores) ? valores : [valores];
  for (const valor of lista) {
    const d = soloDigitos(valor);
    if (!d) continue;
    if (d.length >= 8) numeros.add(d);
    else if (permitirPrefijos && d.length >= 2 && d.length <= 7) prefijos.add(d);
  }
  return { numeros: [...numeros], prefijos: [...prefijos] };
}

function recortar(data) {
  for (const clave of ['numeros', 'prefijos', 'permitidos']) {
    if (!Array.isArray(data[clave])) data[clave] = [];
    if (data[clave].length > MAX_ENTRADAS) data[clave] = data[clave].slice(0, MAX_ENTRADAS);
  }
}

export function getFiltrosGlobales() {
  const data = cargar();
  return {
    activo: !!data.activo,
    numeros: Array.isArray(data.numeros) ? [...data.numeros] : [],
    prefijos: Array.isArray(data.prefijos) ? [...data.prefijos] : [],
    permitidos: Array.isArray(data.permitidos) ? [...data.permitidos] : []
  };
}

export function setFiltrosGlobales({ activo, numeros, prefijos, permitidos, bloqueados } = {}) {
  const data = cargar();
  if (typeof activo === 'boolean') data.activo = activo;
  if (bloqueados !== undefined) {
    const entradas = normalizarEntradas(bloqueados);
    data.numeros = entradas.numeros;
    data.prefijos = entradas.prefijos;
  } else if (numeros !== undefined || prefijos !== undefined) {
    const entradas = normalizarEntradas([...(numeros || []), ...(prefijos || [])]);
    data.numeros = entradas.numeros;
    data.prefijos = entradas.prefijos;
  }
  if (permitidos !== undefined) {
    data.permitidos = normalizarEntradas(permitidos, { permitirPrefijos: false }).numeros;
  }
  recortar(data);
  escribir(data);
  return getFiltrosGlobales();
}

export function buscarBloqueoGlobal(valor) {
  const d = soloDigitos(valor);
  if (!d) return null;
  const filtros = getFiltrosGlobales();
  if (!filtros.activo) return null;
  if (filtros.numeros.includes(d)) return { tipo: 'global', numero: d };
  const prefijo = filtros.prefijos.find((p) => d.startsWith(p));
  if (prefijo) return { tipo: 'global', prefijo, numero: d };
  return null;
}

export function esPermitidoGlobal(valor) {
  const d = soloDigitos(valor);
  if (!d) return false;
  return getFiltrosGlobales().permitidos.includes(d);
}

export const filtrosGlobales = {
  getFiltrosGlobales,
  setFiltrosGlobales,
  buscarBloqueoGlobal,
  esPermitidoGlobal
};

export default filtrosGlobales;
