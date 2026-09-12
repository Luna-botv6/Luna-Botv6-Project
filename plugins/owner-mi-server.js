import { isRegistered, saveCredentials, resetCredentials } from '../lib/funcion/panel-auth.js';
import { getPanelTunnelUrl } from '../lib/funcion/cloudflare-tunnel.js';

const pendingUsernames = new Map();
const AUTODELETE_MS = 120000;

async function buildLinksText(t) {
  const tunnelUrl = getPanelTunnelUrl();
  if (!tunnelUrl) {
    return t?.tunel_no_listo || '⚠️ El túnel todavía no está listo. Probá de nuevo en unos segundos.';
  }
  return tunnelUrl + '/panel';
}

async function responder(conn, m, texto) {
  return conn.sendMessage(m.chat, {text: texto}, {quoted: m});
}

const handler = async (m, {conn, text, command, isROwner}) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.owner_mi_server || {};
  if (!isROwner) throw t.solo_owner || 'Este comando es solo para el Owner.';
  if (m.chat.endsWith('@g.us')) {
    return responder(conn, m, t.solo_privado || '🔒 Este comando solo funciona en chat privado.');
  }

  if (command === 'miserver') {
    if (!isRegistered()) {
      return responder(conn, m, t.bienvenida || '👋 *Bienvenido al panel de Luna-BotV6*\n\nEs tu primera vez acá. Primero elegí un usuario:\n*.reg TuUsuario*\n\n_Ejemplo: .reg Lunabot_');
    }
    const linksText = await buildLinksText(t);
    return responder(conn, m,
      (t.acceso_panel || '🔗 *Tu acceso al panel*\n\n') +
      linksText +
      (t.advertencia || '\n\n⚠️ No compartas tu usuario y contraseña con nadie, ni siquiera con el creador del bot. Es la única forma de garantizar tu seguridad y la del bot.\n\n') +
      (t.recordatorio || '_¿Te olvidaste tus datos? Usá .resetserver_')
    );
  }

  if (command === 'reg') {
    if (isRegistered()) {
      return responder(conn, m, t.ya_configurado || '⚠️ Ya tenés un usuario configurado. Si lo olvidaste, usá *.resetserver* para empezar de nuevo.');
    }
    const usuario = (text || '').trim();
    if (!usuario || usuario.length < 3) {
      return responder(conn, m, t.usuario_corto || '❌ Elegí un usuario de al menos 3 caracteres. Ejemplo: .reg Lunabot');
    }
    if (/\s/.test(usuario)) {
      return responder(conn, m, t.usuario_espacios || '❌ El usuario no puede tener espacios. Ejemplo: .reg Lunabot');
    }
    pendingUsernames.set(m.sender, usuario);
    return responder(conn, m,
      (t.usuario_ok || '✅ Tu usuario es *{usuario}*\n\n').replace('{usuario}', usuario) +
      (t.elegir_password || 'Ahora elegí una contraseña:\n*.password TuContraseñaSegura*\n\n') +
      (t.ejemplo_password || '_Ejemplo: .password 629827#@6#88#7_')
    );
  }

  if (command === 'password') {
    const usuario = pendingUsernames.get(m.sender);
    if (!usuario) {
      return responder(conn, m, t.reg_primero || '❌ Primero elegí tu usuario con *.reg TuUsuario*.');
    }
    const password = (text || '').trim();
    if (!password || password.length < 6) {
      return responder(conn, m, t.password_corta || '❌ La contraseña tiene que tener al menos 6 caracteres.');
    }

    saveCredentials(usuario, password);
    pendingUsernames.delete(m.sender);

    const linksText = await buildLinksText(t);
    const confirmacion = await responder(conn, m,
      (t.guardado || '🔐 *Listo, guardá esto en un lugar seguro*\n\n') +
      (t.usuario_label || 'Usuario: *{usuario}*\n').replace('{usuario}', usuario) +
      (t.password_label || 'Contraseña: *{password}*\n\n').replace('{password}', password) +
      '🔗 ' + linksText +
      (t.advertencia_datos || '\n\n⚠️ No compartas estos datos con nadie, ni con el creador del bot.\n') +
      (t.autodestruccion || '🕑 Este mensaje se autodestruye en 2 minutos.')
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
    return responder(conn, m, t.reset_ok || '♻️ Se borró tu usuario y contraseña. Usá *.miserver* para configurar uno nuevo.');
  }
};

handler.help = ['miserver', 'reg <usuario>', 'password <contraseña>', 'resetserver'];
handler.tags = ['owner'];
handler.command = ['miserver', 'reg', 'password', 'resetserver'];
handler.rowner = true;
handler.private = true;

export default handler;