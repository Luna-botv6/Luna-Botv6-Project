import fs from 'fs';
import path from 'path';

const usersPath = path.resolve('./database/users.json');

if (!fs.existsSync(usersPath)) {
  fs.writeFileSync(usersPath, '{}');
}

let usersData = {};

try {
  usersData = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
} catch (e) {
  console.error('Error leyendo users.json:', e);
  usersData = {};
}

function getUser(id) {
  return usersData[id] || {};
}

function setUser(id, data) {
  usersData[id] = { ...(usersData[id] || {}), ...data };
  fs.writeFileSync(usersPath, JSON.stringify(usersData, null, 2));
}

function getAllUsers() {
  return usersData;
}

export { getUser, setUser, getAllUsers };