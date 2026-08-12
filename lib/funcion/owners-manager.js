import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const configPath = path.join(__dirname, '../../config.js');

function updateConfigFile(number) {
  try {
    let configContent = fs.readFileSync(configPath, 'utf8');
    const ownerRegex = /global\.owner\s*=\s*\[([\s\S]*?)\];/;
    const match = configContent.match(ownerRegex);
    if (!match) return false;
    const newOwner = `  ['${number}', 'OWNER-AGREGADO', true]`;
    const cleanOwners = match[1].trim() ? match[1].replace(/,\s*$/, '') : '';
    const updatedOwners = cleanOwners ? cleanOwners + ',\n' + newOwner : '\n' + newOwner;
    configContent = configContent.replace(ownerRegex, `global.owner = [${updatedOwners}\n];`);
    fs.writeFileSync(configPath, configContent, 'utf8');
    return true;
  } catch (error) {
    console.error('Error al actualizar config.js:', error);
    return false;
  }
}

function removeFromConfigFile(identifier) {
  try {
    let configContent = fs.readFileSync(configPath, 'utf8');
    const ownerRegex = /global\.owner\s*=\s*\[([\s\S]*?)\];/;
    const match = configContent.match(ownerRegex);
    if (!match) return false;
    const filteredLines = match[1].split('\n').filter((line) => !line.includes(`'${identifier}'`));
    configContent = configContent.replace(ownerRegex, `global.owner = [${filteredLines.join('\n')}];`);
    fs.writeFileSync(configPath, configContent, 'utf8');
    return true;
  } catch (error) {
    console.error('Error al remover de config.js:', error);
    return false;
  }
}

function updateLidConfigFile(lid) {
  try {
    let configContent = fs.readFileSync(configPath, 'utf8');
    const lidRegex = /global\.lidOwners\s*=\s*\[([\s\S]*?)\];/;
    const match = configContent.match(lidRegex);
    if (!match) return false;
    const newLid = `  "${lid}"`;
    const cleanLids = match[1].trim() ? match[1].replace(/,\s*$/, '') : '';
    const updatedLids = cleanLids ? cleanLids + ',\n' + newLid : '\n' + newLid;
    configContent = configContent.replace(lidRegex, `global.lidOwners = [${updatedLids}\n];`);
    fs.writeFileSync(configPath, configContent, 'utf8');
    return true;
  } catch (error) {
    console.error('Error al actualizar lidOwners en config.js:', error);
    return false;
  }
}

function removeLidFromConfigFile(lid) {
  try {
    let configContent = fs.readFileSync(configPath, 'utf8');
    const lidRegex = /global\.lidOwners\s*=\s*\[([\s\S]*?)\];/;
    const match = configContent.match(lidRegex);
    if (!match) return false;
    const filteredLines = match[1].split('\n').filter((line) => !line.includes(`"${lid}"`));
    configContent = configContent.replace(lidRegex, `global.lidOwners = [${filteredLines.join('\n')}];`);
    fs.writeFileSync(configPath, configContent, 'utf8');
    return true;
  } catch (error) {
    console.error('Error al remover lidOwner de config.js:', error);
    return false;
  }
}

export function listOwners() {
  return global.owner.map(([numero, nombre]) => ({numero, nombre}));
}

export function addOwner(numero, nombre) {
  const numeroLimpio = (numero || '').replace(/[^0-9]/g, '');
  if (!numeroLimpio || numeroLimpio.length < 10) {
    return {success: false, error: 'El número debe tener al menos 10 dígitos.'};
  }
  if (global.owner.some(([num]) => num === numeroLimpio)) {
    return {success: false, error: 'Este número ya es owner.'};
  }
  const nombreFinal = (nombre || '').trim() || 'OWNER-AGREGADO';
  global.owner.push([numeroLimpio, nombreFinal, true]);
  if (!updateConfigFile(numeroLimpio)) {
    global.owner.pop();
    return {success: false, error: 'No se pudo guardar en config.js.'};
  }
  return {success: true, owners: listOwners()};
}

export function removeOwner(numero) {
  const numeroLimpio = (numero || '').replace(/[^0-9]/g, '');
  const index = global.owner.findIndex(([num]) => num === numeroLimpio);
  if (index === -1) return {success: false, error: 'Este número no está registrado como owner.'};
  if (global.owner.length === 1) return {success: false, error: 'No podés quitar el último owner.'};

  const removido = global.owner[index];
  global.owner.splice(index, 1);
  if (!removeFromConfigFile(numeroLimpio)) {
    global.owner.splice(index, 0, removido);
    return {success: false, error: 'No se pudo guardar en config.js.'};
  }
  return {success: true, owners: listOwners()};
}

export function listLidOwners() {
  return (global.lidOwners || []).map((lid) => ({lid}));
}

export function addLidOwner(lid) {
  const lidLimpio = (lid || '').replace(/[^0-9]/g, '');
  if (!lidLimpio || lidLimpio.length < 10) {
    return {success: false, error: 'El LID debe tener al menos 10 dígitos.'};
  }
  if (!global.lidOwners) global.lidOwners = [];
  if (global.lidOwners.includes(lidLimpio)) {
    return {success: false, error: 'Este LID ya está registrado como owner.'};
  }
  global.lidOwners.push(lidLimpio);
  if (!updateLidConfigFile(lidLimpio)) {
    global.lidOwners.pop();
    return {success: false, error: 'No se pudo guardar en config.js.'};
  }
  return {success: true, lidOwners: listLidOwners()};
}

export function removeLidOwner(lid) {
  const lidLimpio = (lid || '').replace(/[^0-9]/g, '');
  const index = (global.lidOwners || []).indexOf(lidLimpio);
  if (index === -1) return {success: false, error: 'Este LID no está registrado como owner.'};

  global.lidOwners.splice(index, 1);
  if (!removeLidFromConfigFile(lidLimpio)) {
    global.lidOwners.splice(index, 0, lidLimpio);
    return {success: false, error: 'No se pudo guardar en config.js.'};
  }
  return {success: true, lidOwners: listLidOwners()};
}
