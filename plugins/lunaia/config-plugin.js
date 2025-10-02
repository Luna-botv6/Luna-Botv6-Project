import configHandler from '../config-funciones.js';

const CONFIG_OPTIONS = {
  welcome: ['bienvenida', 'welcome'],
  detect: ['detect', 'detectar'],
  detect2: ['detect2', 'detectar2'],
  antilink: ['antilink', 'antienlace'],
  antilink2: ['antilink2', 'antienlace2'],
  antiviewonce: ['antiviewonce', 'antivervezuna'],
  modohorny: ['modohorny', 'horny'],
  modoadmin: ['modoadmin', 'soloadmin'],
  autosticker: ['autosticker', 'autostickers'],
  audios: ['audios'],
  antidelete: ['antidelete', 'antieliminar'],
  antitoxic: ['antitoxic', 'antitoxico', 'antitóxico'],
  antitraba: ['antitraba', 'antilag'],
  antiarabes: ['antiarabes', 'antiarabe'],
  antiarabes2: ['antiarabes2', 'antiarabe2'],
  afk: ['afk'],
  public: ['public', 'publico', 'público'],
  restrict: ['restrict', 'restringir'],
  autoread: ['autoread', 'autoleer'],
  pconly: ['pconly', 'solopc', 'privateonly'],
  gconly: ['gconly', 'sologrupos', 'grouponly'],
  anticall: ['anticall', 'antillamada', 'antillamadas'],
  audios_bot: ['audios_bot', 'audiosbot'],
  modoia: ['modoia', 'ia'],
  antispam: ['antispam'],
  modejadibot: ['modejadibot', 'jadibot'],
  antiprivado: ['antiprivado', 'antiprivate']
};

function normalizeText(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function parseCommands(text) {
  const normalized = normalizeText(text);
  const commands = [];
  
  const enableRegex = /\b(activa|activar|enable|habilitar|encender|on|si|enciende|prende|prender)\b/i;
  const disableRegex = /\b(desactiva|desactivar|disable|deshabilitar|apaga|apagar|off|no|quita|quitar)\b/i;
  
  let enable = null;
  if (enableRegex.test(normalized)) enable = true;
  if (disableRegex.test(normalized)) enable = false;
  
  if (enable === null) return commands;
  
  for (const [key, keywords] of Object.entries(CONFIG_OPTIONS)) {
    if (keywords.some(kw => normalized.includes(kw))) {
      commands.push({ option: key, enable });
    }
  }
  
  return commands;
}

function canHandle(text) {
  const commands = parseCommands(text);
  return commands.length > 0;
}

async function handle(inputText, context) {
  const { conn, msg, jid } = context;

  try {
    const commands = parseCommands(inputText);
    
    if (!commands.length) return;

    console.log(`🔧 Config-plugin detectó: ${JSON.stringify(commands)}`);

    const m = {
      ...msg,
      chat: jid,
      sender: msg.key.participant || msg.key.remoteJid,
      isGroup: jid.endsWith('@g.us'),
      key: msg.key
    };

    let isAdmin = false;
    let isOwner = false;
    
    if (m.isGroup) {
      const groupMetadata = await conn.groupMetadata(jid);
      const participants = groupMetadata.participants;
      

      const senderId = m.sender.split('@')[0].split(':')[0];
      
  
      const participant = participants.find(p => {
        const participantId = p.id.split('@')[0].split(':')[0];
        return participantId === senderId;
      });
      
      if (participant) {
        isAdmin = participant.admin === 'admin' || participant.admin === 'superadmin';
      }
      
      console.log(`👤 Sender: ${m.sender}`);
      console.log(`🔍 Buscando: ${senderId}`);
      console.log(`👮 Es admin: ${isAdmin}`);
    }

    const owners = global.owner || [];
    const senderNumber = m.sender.replace(/\D/g, '');
    
    isOwner = owners.some(owner => {
      const ownerNumber = (typeof owner === 'object' ? owner[0] : owner).toString().replace(/\D/g, '');
      return ownerNumber === senderNumber;
    });

    for (const cmd of commands) {
      const { option, enable } = cmd;
      const command = enable ? 'enable' : 'disable';
      
      console.log(`✅ Ejecutando: ${command} ${option}`);

      const handlerContext = {
        conn,
        args: [option],
        command: command,
        usedPrefix: '/',
        isOwner: isOwner,
        isAdmin: isAdmin,
        isROwner: isOwner
      };

      try {
        await configHandler(m, handlerContext);
      } catch (handlerError) {
        if (handlerError !== false) {
          console.error(`❌ Error en ${option}:`, handlerError);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error en config-plugin:', error);
    await conn.sendMessage(jid, { 
      text: '⚠️ Error al procesar la configuración.' 
    }, { quoted: msg });
  }
}

export default {
  canHandle,
  handle,
  name: 'config-multi',
  description: 'Configurar opciones mediante lenguaje natural'
};