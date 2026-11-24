export async function nombreSeguro(conn, id, fallback = '') {
  try {
    const valor = conn?.getName?.(id);
    const nombre = await Promise.resolve(valor);
    if (typeof nombre === 'string' && nombre.trim()) return nombre.trim();
    return fallback;
  } catch {
    return fallback;
  }
}
