import WebSocket from 'ws';
import http from 'http';

const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000];
const HEARTBEAT_TIMEOUT_MS = 40000;

function forwardToLocal(routeKey, headers, body, port) {
  return new Promise((resolve) => {
    const [method, subPath] = routeKey.split(' ');
    const localPath = '/panel' + (subPath === '/' ? '' : subPath);

    const payload = body ? JSON.stringify(body) : null;
    const reqHeaders = {'content-type': 'application/json'};
    if (headers?.['X-Panel-User']) reqHeaders['x-panel-user'] = headers['X-Panel-User'];
    if (headers?.['X-Panel-Pass']) reqHeaders['x-panel-pass'] = headers['X-Panel-Pass'];
    if (payload) reqHeaders['content-length'] = Buffer.byteLength(payload);

    const localReq = http.request(
      {host: '127.0.0.1', port, path: localPath, method, headers: reqHeaders},
      (localRes) => {
        let raw = '';
        localRes.on('data', (chunk) => { raw += chunk; });
        localRes.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = {ok: false, error: 'respuesta_no_json'};
          }
          resolve({status: localRes.statusCode, body: parsed});
        });
      }
    );

    localReq.on('error', () => {
      resolve({status: 502, body: {ok: false, error: 'local_bridge_failed'}});
    });

    if (payload) localReq.write(payload);
    localReq.end();
  });
}

export function startPanelWsClient({centralUrl, botId, secret, localPort}) {
  if (!centralUrl || !botId || !secret) {
    console.log('[panel-ws] PANEL_CENTRAL_URL / PANEL_BOT_ID / PANEL_BOT_SECRET no configurados, se omite la conexión.');
    return;
  }

  let attempt = 0;
  let ws = null;
  let heartbeatTimer = null;

  function connect() {
    const target = `${centralUrl}/bot-connect?botId=${encodeURIComponent(botId)}&secret=${encodeURIComponent(secret)}`;
    ws = new WebSocket(target);

    ws.on('open', () => {
      attempt = 0;
      console.log('[panel-ws] conectado al server central');
      resetHeartbeatWatchdog();
    });

    ws.on('ping', resetHeartbeatWatchdog);

    ws.on('message', async (raw) => {
      resetHeartbeatWatchdog();
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }
      if (msg.type !== 'request') return;

      const result = await forwardToLocal(msg.route, msg.headers, msg.body, localPort);
      const response = JSON.stringify({type: 'response', id: msg.id, status: result.status, body: result.body});
      try {
        ws.send(response);
      } catch {}
    });

    ws.on('close', scheduleReconnect);
    ws.on('error', () => {
      try { ws.terminate(); } catch {}
    });
  }

  function resetHeartbeatWatchdog() {
    if (heartbeatTimer) clearTimeout(heartbeatTimer);
    heartbeatTimer = setTimeout(() => {
      try { ws.terminate(); } catch {}
    }, HEARTBEAT_TIMEOUT_MS);
  }

  function scheduleReconnect() {
    if (heartbeatTimer) clearTimeout(heartbeatTimer);
    const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];
    attempt += 1;
    console.log(`[panel-ws] desconectado, reintentando en ${delay}ms`);
    setTimeout(connect, delay);
  }

  connect();
}
