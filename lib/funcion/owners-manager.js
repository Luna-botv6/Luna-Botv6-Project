import {
  listOwners as listSystemOwners,
  addOwner as addSystemOwner,
  removeOwner as removeSystemOwner,
  listSubOwners as listSystemSubOwners,
  addSubOwner as addSystemSubOwner,
  removeSubOwner as removeSystemSubOwner
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

export function listSubOwners() {
  return listSystemSubOwners();
}

export function addSubOwner(numero, nombre) {
  return addSystemSubOwner(numero, nombre);
}

export function removeSubOwner(numero) {
  return removeSystemSubOwner(numero);
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
