import { readFileSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { createHash } from 'crypto';

export function serialize(v) {
  if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) return { t: 'p', v };
  if (v instanceof RegExp) return { t: 're', s: v.source, f: v.flags };
  if (Array.isArray(v)) return { t: 'arr', v: v.map(serialize) };
  if (typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype) {
    const o = {};
    for (const k of Object.keys(v)) o[k] = serialize(v[k]);
    return { t: 'obj', v: o };
  }
  throw new Error('unsupported');
}

export function deserialize(x) {
  switch (x.t) {
    case 'p': return x.v;
    case 're': return new RegExp(x.s, x.f);
    case 'arr': return x.v.map(deserialize);
    case 'obj': return Object.fromEntries(Object.entries(x.v).map(([k, v]) => [k, deserialize(v)]));
    default: throw new Error('manifest corrupto');
  }
}

export function hashFile(full) {
  return createHash('sha1').update(readFileSync(full)).digest('hex');
}

const pending = new Map();

function loadReal(filename, pluginFolder) {
  if (pending.has(filename)) return pending.get(filename);
  const p = import(pathToFileURL(join(pluginFolder, filename)).href).then((m) => m.default || m);
  pending.set(filename, p);
  p.catch(() => pending.delete(filename));
  return p;
}

function buildStub(filename, props, pluginFolder) {
  const stub = async function (m, extra) {
    const real = await loadReal(filename, pluginFolder);
    if (global.plugins[filename] === stub) global.plugins[filename] = real;
    return real.call(this, m, extra);
  };
  for (const [k, v] of Object.entries(props)) {
    Object.defineProperty(stub, k, { value: deserialize(v), writable: true, enumerable: true, configurable: true });
  }
  Object.defineProperty(stub, '__lazy', { value: true });
  return stub;
}

export function planPlugins(files, pluginFolder, manifestPath) {
  let manifest = null;
  try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch {}
  const eager = [];
  const lazy = {};
  for (const f of files) {
    const e = manifest?.plugins?.[f];
    if (!e?.lazy) { eager.push(f); continue; }
    try {
      if (hashFile(join(pluginFolder, f)) !== e.hash) { eager.push(f); continue; }
      lazy[f] = buildStub(f, e.props, pluginFolder);
    } catch {
      eager.push(f);
    }
  }
  return { eager, lazy };
}
