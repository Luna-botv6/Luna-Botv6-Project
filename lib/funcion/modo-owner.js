import { isBotFunctionEnabled } from './bot-settings.js';

export function modoOwnerActivo(conn) {
  return isBotFunctionEnabled('modoowner', conn);
}

export function puedeUsarBot(modoActivo, { isOwner = false, isROwner = false, isSubOwner = false } = {}) {
  return !modoActivo || isOwner || isROwner || isSubOwner;
}
