import fs from 'fs';

let activeTunnel = null;
let restartTimer = null;

export async function startCloudflareTunnel(port) {
  try {
    const {bin, install, Tunnel} = await import('cloudflared');

    if (!fs.existsSync(bin)) {
      console.log('[ ℹ️ ] Instalando cloudflared por primera vez...');
      await install(bin);
    }

    activeTunnel = Tunnel.quick(`http://localhost:${port}`);

    activeTunnel.on('url', (url) => {
      global.panelTunnelUrl = url;
      console.log('[ ℹ️ ] Panel disponible por HTTPS:', url + '/panel');
    });

    activeTunnel.on('error', () => {});

    activeTunnel.on('exit', () => {
      global.panelTunnelUrl = null;
      activeTunnel = null;
      clearTimeout(restartTimer);
      restartTimer = setTimeout(() => startCloudflareTunnel(port), 15000);
    });
  } catch (e) {
    console.log('[ ℹ️ ] No se pudo iniciar el túnel de Cloudflare:', e.message);
  }
}

export function getPanelTunnelUrl() {
  return global.panelTunnelUrl || null;
}
