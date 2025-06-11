import { Low, JSONFile } from 'lowdb';
import fs from 'fs';

const db = new Low(new JSONFile('./database/minar.json'));

async function loadDB() {
  await db.read();
  db.data ||= { users: {} };
  return db;
}

export async function getLastMiningTime(userId) {
  const db = await loadDB();
  return db.data.users[userId]?.lastMining || 0;
}

export async function setLastMiningTime(userId, time) {
  const db = await loadDB();
  db.data.users[userId] ||= {};
  db.data.users[userId].lastMining = time;
  await db.write();
}

export async function initMiningUser(userId) {
  const db = await loadDB();
  db.data.users[userId] ||= { lastMining: 0 };
  await db.write();
}