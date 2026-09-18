import fs from 'fs';

let activeTunnel = null;
let openingPromise = null;
let closeTimer = null;

function waitForUrl(tunnel) {
  if (global.panelTunnelUrl) return Promise.resolve(global.panelTunnelUrl);
  return new Promise((resolve, reject) => {
    const onUrl = (url) => { cleanup(); resolve(url); };
    const onExit = () => { cleanup(); reject(new Error('tunnel_murio')); };
    const timer = setTimeout(() => { cleanup(); reject(new Error('tunnel_timeout')); }, 20000);
    function cleanup() {
      clearTimeout(timer);
      tunnel.off('url', onUrl);
      tunnel.off('exit', onExit);
    }
    tunnel.on('url', onUrl);
    tunnel.on('exit', onExit);
  });
}

export async function openCloudflareTunnel(port) {
  if (activeTunnel && global.panelTunnelUrl) return global.panelTunnelUrl;
  if (openingPromise) return openingPromise;
  openingPromise = (async () => {
    const { bin, install, Tunnel } = await import('cloudflared');
    if (!activeTunnel) {
      if (!fs.existsSync(bin)) {
        console.log('[ ℹ️ ] Instalando cloudflared por primera vez...');
        await install(bin);
      }
      const tunnel = Tunnel.quick(`http://localhost:${port}`);
      tunnel.on('url', (url) => {
        global.panelTunnelUrl = url;
        console.log('[ ℹ️ ] Panel disponible por HTTPS:', url + '/panel');
      });
      tunnel.on('error', () => {});
      tunnel.on('exit', () => {
        if (activeTunnel === tunnel) {
          activeTunnel = null;
          global.panelTunnelUrl = null;
        }
      });
      activeTunnel = tunnel;
    }
    return waitForUrl(activeTunnel);
  })().finally(() => { openingPromise = null; });
  return openingPromise;
}

export function closeCloudflareTunnel() {
  cancelAutoClose();
  const tunnel = activeTunnel;
  activeTunnel = null;
  global.panelTunnelUrl = null;
  if (tunnel) {
    try { tunnel.stop(); } catch {}
  }
}

export function scheduleAutoClose(ms = 60000) {
  cancelAutoClose();
  closeTimer = setTimeout(() => {
    closeTimer = null;
    closeCloudflareTunnel();
  }, ms);
}

export function cancelAutoClose() {
  if (closeTimer) {
    clearTimeout(closeTimer);
    closeTimer = null;
  }
}

export function getPanelTunnelUrl() {
  return global.panelTunnelUrl || null;
}

process.once('exit', () => {
  if (activeTunnel) {
    try { activeTunnel.stop(); } catch {}
  }
});