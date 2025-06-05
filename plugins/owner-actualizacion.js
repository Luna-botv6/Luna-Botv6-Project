import axios from 'axios';
import fs from 'fs';

let lastCommitSHA = '';

const owner = 'Luna-botv6';
const repo = 'Luna-Botv6-Project';
const branch = 'main'; // Asegúrate de usar la rama principal

const handler = async (m, { conn }) => {
  try {
    await conn.sendMessage(m.chat, { text: '🔍 Buscando actualizaciones en el repositorio...' }, { quoted: m });

    const { data: commits } = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`);
    const latestCommit = commits[0];
    const { sha, commit: { message }, author } = latestCommit;
    const login = author?.login || 'Desconocido';

    if (sha === lastCommitSHA) {
      return conn.sendMessage(m.chat, { text: '✅ No hay nuevas actualizaciones desde la última revisión.' }, { quoted: m });
    }

    lastCommitSHA = sha;

    const { data: commitDetails } = await axios.get(`https://api.github.com/repos/${owner}/${repo}/commits/${sha}`);
    const files = commitDetails.files || [];

    let filesChanged = files.map(f => `- ${f.filename} (${f.status})`).join('\n');
    if (!filesChanged) filesChanged = 'No se encontraron archivos modificados.';

    // Comparar el primer archivo modificado con el local
    let comparisonText = '';
    if (files.length > 0) {
      const filePath = files[0].filename;

      // Obtener contenido remoto
      const rawURL = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
      const { data: remoteContent } = await axios.get(rawURL);

      // Leer archivo local
      let localContent = '';
      try {
        localContent = fs.readFileSync(filePath, 'utf8');
      } catch {
        localContent = '(No existe localmente)';
      }

      // Comparar
      if (remoteContent === localContent) {
        comparisonText = `✅ El archivo "${filePath}" está actualizado localmente.`;
      } else {
        comparisonText = `⚠️ El archivo "${filePath}" es diferente localmente.`;
      }
    }

    const text = `📢 Nueva actualización detectada:\n\n` +
      `🔹 Autor: ${login}\n` +
      `🔹 Mensaje: ${message}\n` +
      `🔹 Archivos cambiados:\n${filesChanged}\n\n` +
      `${comparisonText}\n\n` +
      `💡 Si tienes la función de auto-actualización activa, **reinicia el bot** para que los cambios se apliquen.`;

    await conn.sendMessage(m.chat, { text }, { quoted: m });

  } catch (error) {
    console.error(error);
    await conn.sendMessage(m.chat, { text: '❌ Error al consultar el repositorio o comparar archivos. Intenta más tarde.' }, { quoted: m });
  }
};

handler.command = /^(actualizacion|actualizaciones)$/i;
handler.rowner = true;

export default handler;
