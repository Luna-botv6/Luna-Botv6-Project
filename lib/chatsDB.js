import fs from 'fs';
import path from 'path';

const chatsPath = path.resolve('./database/chats.json');

if (!fs.existsSync(chatsPath)) {
  fs.writeFileSync(chatsPath, '{}');
}

let chatsData = {};

try {
  chatsData = JSON.parse(fs.readFileSync(chatsPath, 'utf-8'));
} catch (e) {
  console.error('Error leyendo chats.json:', e);
  chatsData = {};
}

function getChat(id) {
  return chatsData[id] || {};
}

function setChat(id, data) {
  chatsData[id] = { ...(chatsData[id] || {}), ...data };
  fs.writeFileSync(chatsPath, JSON.stringify(chatsData, null, 2));
}

function getAllChats() {
  return chatsData;
}

export { getChat, setChat, getAllChats };