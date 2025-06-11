// lib/exp.js

import fs from 'fs';

const DB_PATHS = {

  minar: './database/minar.json',

  cazar: './database/cazar.json',

  trabajar: './database/trabajo.json'

};

function getExpFromFile(path) {

  if (!fs.existsSync(path)) return {};

  try {

    return JSON.parse(fs.readFileSync(path));

  } catch {

    return {};

  }

}

export function getUserTotalExp(userid) {

  let total = 0;

  let detalle = {};

  for (const [modulo, path] of Object.entries(DB_PATHS)) {

    const db = getExpFromFile(path);

    const userData = db[userid] || { exp: 0, nivel: 0, diamantes: 0 };

    detalle[modulo] = userData;

    total += userData.exp || 0;

  }

  return { total, detalle };

}