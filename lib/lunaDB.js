import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Necesario para obtener la ruta __dirname en ES Modules
const __dirname = dirname(fileURLToPath(import.meta.url));
const USERS_DIR = path.resolve(__dirname, '../database/users'); // Ajusta según la estructura real

// ✅ Asegura que exista la carpeta de usuarios
async function ensureUsersDir() {
  try {
    await fs.mkdir(USERS_DIR, { recursive: true });
  } catch (e) {
    console.error('Error al crear la carpeta de usuarios:', e);
  }
}

// ⚡ Cargar los datos de un usuario específico
export async function getUser(jid) {
  await ensureUsersDir();

  const filePath = path.join(USERS_DIR, `${jid}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    // Si no existe, devuelve datos predeterminados
    return {
      id: jid,
      premiumTime: 0,
      nivel: 0,
      exp: 0,
      // ...otros campos predeterminados que quieras
    };
  }
}

// ⚡ Guardar los datos actualizados de un usuario
export async function saveUser(jid, userData) {
  await ensureUsersDir();

  const filePath = path.join(USERS_DIR, `${jid}.json`);
  try {
    await fs.writeFile(filePath, JSON.stringify(userData, null, 2));
  } catch (e) {
    console.error(`Error guardando datos de ${jid}:`, e);
  }
}

// ⚡ Obtener todos los usuarios (opcional)
export async function getAllUsers() {
  await ensureUsersDir();

  const files = await fs.readdir(USERS_DIR);
  const users = [];

  for (const file of files) {
    if (file.endsWith('.json')) {
      const data = await fs.readFile(path.join(USERS_DIR, file), 'utf-8');
      users.push(JSON.parse(data));
    }
  }
  return users;
}
