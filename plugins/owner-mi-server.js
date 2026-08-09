import fetch from 'node-fetch';
import { isRegistered, saveCredentials, resetCredentials } from '../lib/funcion/panel-auth.js';
import { ensureBotIdentity } from '../lib/funcion/bot-identity.js';
import { getPanelTunnelUrl } from '../lib/funcion/cloudflare-tunnel.js';

const PANEL_CENTRAL_HTTP = 'http://204.12.204.5:4012';

const pendingUsernames = new Map();
const AUTODELETE_MS = 120000;

async function buildLink() {
  try {
    const {botId, secret} = await ensureBotIdentity(PANEL_CENTRAL_HTTP);
    const resp = await fetch(`${PANEL_CENTRAL_HTTP}/bot/create-token`, {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({botId, secret})
    });
    const data = await resp.json();
    if (!data.ok) return null;
    return `${PANEL_CENTRAL_HTTP}/api/${data.token}/panel`;
  } catch {
    return null;
  }
}

async function buildLinksText() {
  await buildLink();
  const tunnelUrl = getPanelTunnelUrl();
  if (!tunnelUrl) {
    return '⚠️ El túnel todavía no está listo. Probá de nuevo en unos segundos.';
  }
  return tunnelUrl + '/panel';
}

async function responder(conn, m, texto) {
  return conn.sendMessage(m.chat, {text: texto}, {quoted: m});
}

const handler = async (m, {conn, text, command, isROwner}) => {
  if (!isROwner) throw 'Este comando es solo para el Owner.';
  if (m.chat.endsWith('@g.us')) {
    return responder(conn, m, '🔒 Este comando solo funciona en chat privado.');
  }

  if (command === 'miserver') {
    if (!isRegistered()) {
      return responder(conn, m,
        '👋 *Bienvenido al panel de Luna-BotV6*\n\n' +
        'Es tu primera vez acá. Primero elegí un usuario:\n' +
        '*.reg TuUsuario*\n\n' +
        '_Ejemplo: .reg Lunabot_'
      );
    }
    const linksText = await buildLinksText();
    return responder(conn, m,
      '🔗 *Tu acceso al panel*\n\n' +
      linksText +
      '\n\n⚠️ No compartas tu usuario y contraseña con nadie, ni siquiera con el creador del bot. Es la única forma de garantizar tu seguridad y la del bot.\n\n' +
      '_¿Te olvidaste tus datos? Usá .resetserver_'
    );
  }

  if (command === 'reg') {
    if (isRegistered()) {
      return responder(conn, m, '⚠️ Ya tenés un usuario configurado. Si lo olvidaste, usá *.resetserver* para empezar de nuevo.');
    }
    const usuario = (text || '').trim();
    if (!usuario || usuario.length < 3) {
      return responder(conn, m, '❌ Elegí un usuario de al menos 3 caracteres. Ejemplo: .reg Lunabot');
    }
    if (/\s/.test(usuario)) {
      return responder(conn, m, '❌ El usuario no puede tener espacios. Ejemplo: .reg Lunabot');
    }
    pendingUsernames.set(m.sender, usuario);
    return responder(conn, m,
      '✅ Tu usuario es *' + usuario + '*\n\n' +
      'Ahora elegí una contraseña:\n*.password TuContraseñaSegura*\n\n' +
      '_Ejemplo: .password 629827#@6#88#7_'
    );
  }

  if (command === 'password') {
    const usuario = pendingUsernames.get(m.sender);
    if (!usuario) {
      return responder(conn, m, '❌ Primero elegí tu usuario con *.reg TuUsuario*.');
    }
    const password = (text || '').trim();
    if (!password || password.length < 6) {
      return responder(conn, m, '❌ La contraseña tiene que tener al menos 6 caracteres.');
    }

    saveCredentials(usuario, password);
    pendingUsernames.delete(m.sender);

    const linksText = await buildLinksText();
    const confirmacion = await responder(conn, m,
      '🔐 *Listo, guardá esto en un lugar seguro*\n\n' +
      'Usuario: *' + usuario + '*\n' +
      'Contraseña: *' + password + '*\n\n' +
      '🔗 ' + linksText +
      '\n\n⚠️ No compartas estos datos con nadie, ni con el creador del bot.\n' +
      '🕑 Este mensaje se autodestruye en 2 minutos.'
    );

    if (confirmacion?.key) {
      setTimeout(() => {
        conn.sendMessage(m.chat, {delete: confirmacion.key}).catch(() => {});
      }, AUTODELETE_MS);
    }
    return;
  }

  if (command === 'resetserver') {
    resetCredentials();
    pendingUsernames.delete(m.sender);
    return responder(conn, m, '♻️ Se borró tu usuario y contraseña. Usá *.miserver* para configurar uno nuevo.');
  }
};

handler.help = ['miserver', 'reg <usuario>', 'password <contraseña>', 'resetserver'];
handler.tags = ['owner'];
handler.command = ['miserver', 'reg', 'password', 'resetserver'];
handler.rowner = true;
handler.private = true;

export default handler;
