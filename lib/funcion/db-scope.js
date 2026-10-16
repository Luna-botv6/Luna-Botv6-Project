import { AsyncLocalStorage } from 'node:async_hooks';

export const dbScope = new AsyncLocalStorage();

export function ejecutarConScope(scope, fn) {
  return dbScope.run(scope, fn);
}

export function scopeActual() {
  return dbScope.getStore() || null;
}

export function idSubbotActual() {
  return dbScope.getStore()?.userId || null;
}

export function dbActiva() {
  return dbScope.getStore()?.db || null;
}
