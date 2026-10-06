import {
  listOwners as listSystemOwners,
  addOwner as addSystemOwner,
  removeOwner as removeSystemOwner
} from './system-owners.js';

export function listOwners() {
  return listSystemOwners();
}

export function addOwner(numero, nombre) {
  return addSystemOwner(numero, nombre);
}

export function removeOwner(numero) {
  return removeSystemOwner(numero);
}

export function listLidOwners() {
  return [];
}

export function addLidOwner() {
  return { success: false, error: 'El sistema de LID owners fue retirado. Solo se usa el número real (JID).' };
}

export function removeLidOwner() {
  return { success: false, error: 'El sistema de LID owners fue retirado. Solo se usa el número real (JID).' };
}
