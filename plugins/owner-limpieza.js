import fs from 'fs';
import { setCleanerStatus, isCleanerEnabled, getAutoCleanConfig } from '../lib/cleaner-config.js';

let isInitialized = false;

async function ensureCleanerDisabled() {
  if (isInitialized) return;
  
  try {
    const configPath = './database/config-cleaner.json';
    
    if (fs.existsSync(configPath)) {
      const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      
      if (data.enabled === true || data.autoClean === true) {
        data.enabled = false;
        data.autoClean = false;
        fs.writeFileSync(configPath, JSON.stringify(data, null, 2), 'utf8');
      }
    } else {
      const defaultConfig = {
        enabled: false,
        autoClean: false,
        intervalHours: 6,
        lastCleanTime: null
      };
      
      const dir = './database';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2), 'utf8');
    }
  } catch (e) {}
  
  isInitialized = true;
}

ensureCleanerDisabled();

const handler = async (m, { text }) => {
  const datas = global || {};
  const dbData = datas.db?.data?.users?.[m.sender] || {};
  const idioma = dbData.language || global.defaultLenguaje || 'es';

  let tradutor = {};
  try {
    const langPath = `./src/languages/${idioma}.json`;
    if (fs.existsSync(langPath)) {
      const _translate = JSON.parse(fs.readFileSync(langPath));
      tradutor = _translate.plugins?.owner_limpieza || {};
    }
  } catch (error) {}

  const defaultTexts = {
    texto1: '💫 Usa: limpieza on/off',
    texto2: '✅ Limpieza manual activada',
    texto3: '❌ Limpieza manual desactivada',
    texto4: '📊 Estado actual:',
    texto5: '🟢 Activa',
    texto6: '🔴 Inactiva',
    texto7: '⚠️ La limpieza automática está deshabilitada permanentemente',
    texto8: '🌙 CONFIGURACION DE LIMPIEZA',
    texto9: '🔧 Limpieza manual:',
    texto10: '🤖 Limpieza automática:',
    texto11: '🛡️ Deshabilitada (Protegiendo keys de sesión)',
    texto12: '📌 COMANDOS DISPONIBLES:',
    texto13: '• limpieza on - Activar limpieza manual',
    texto14: '• limpieza off - Desactivar limpieza manual',
    texto15: '• limpieza status - Ver estado actual',
    texto16: '💡 NOTA: La limpieza automática está desactivada para proteger las keys de sesión y evitar desconexiones'
  };

  const texts = {
    texto1: tradutor.texto1 || defaultTexts.texto1,
    texto2: tradutor.texto2 || defaultTexts.texto2,
    texto3: tradutor.texto3 || defaultTexts.texto3,
    texto4: tradutor.texto4 || defaultTexts.texto4,
    texto5: tradutor.texto5 || defaultTexts.texto5,
    texto6: tradutor.texto6 || defaultTexts.texto6,
    texto7: tradutor.texto7 || defaultTexts.texto7,
    texto8: tradutor.texto8 || defaultTexts.texto8,
    texto9: tradutor.texto9 || defaultTexts.texto9,
    texto10: tradutor.texto10 || defaultTexts.texto10,
    texto11: tradutor.texto11 || defaultTexts.texto11,
    texto12: tradutor.texto12 || defaultTexts.texto12,
    texto13: tradutor.texto13 || defaultTexts.texto13,
    texto14: tradutor.texto14 || defaultTexts.texto14,
    texto15: tradutor.texto15 || defaultTexts.texto15,
    texto16: tradutor.texto16 || defaultTexts.texto16
  };

  const args = text.trim().toLowerCase().split(' ');
  const command = args[0];

  if (command === 'on') {
    setCleanerStatus(true);
    m.reply(texts.texto2);
  } 
  else if (command === 'off') {
    setCleanerStatus(false);
    m.reply(texts.texto3);
  }
  else if (command === 'auto') {
    m.reply(texts.texto7);
  }
  else if (command === 'status' || command === '') {
    const manualEnabled = isCleanerEnabled();
    
    let statusMsg = `${texts.texto8}\n\n`;
    statusMsg += `${texts.texto9} ${manualEnabled ? texts.texto5 : texts.texto6}\n`;
    statusMsg += `${texts.texto10} ${texts.texto11}\n\n`;
    statusMsg += `${texts.texto12}\n`;
    statusMsg += `${texts.texto13}\n`;
    statusMsg += `${texts.texto14}\n`;
    statusMsg += `${texts.texto15}\n\n`;
    statusMsg += `${texts.texto16}`;
    
    m.reply(statusMsg);
  }
  else {
    m.reply(texts.texto1);
  }
};

handler.command = ['limpieza'];
handler.rowner = true;
export default handler;