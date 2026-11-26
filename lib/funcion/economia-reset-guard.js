const TTL_MS = 10 * 60 * 1000;
const porUsuario = new Map();
let todosHasta = 0;

function digitos(id) {
  return String(id || '').split('@')[0].replace(/\D/g, '');
}

export function marcarResetEconomia(id) {
  const d = digitos(id);
  if (d) porUsuario.set(d, Date.now() + TTL_MS);
}

export function limpiarResetEconomia(id) {
  const d = digitos(id);
  if (d) porUsuario.delete(d);
}

export function marcarResetTodos() {
  todosHasta = Date.now() + TTL_MS;
  porUsuario.clear();
}

export function limpiarResetTodos() {
  todosHasta = 0;
}

export function enResetEconomia(id) {
  const ahora = Date.now();
  if (todosHasta > ahora) return true;
  const d = digitos(id);
  if (!d) return false;
  const hasta = porUsuario.get(d);
  if (!hasta) return false;
  if (hasta <= ahora) {
    porUsuario.delete(d);
    return false;
  }
  return true;
}
