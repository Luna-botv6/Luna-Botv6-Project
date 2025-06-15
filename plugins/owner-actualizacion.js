import axios from 'axios';
import fs from 'fs';
import path from 'path';

let lastCommitSHA = '';
const owner = 'Luna-botv6';
const repo = 'Luna-Botv6-Project';
const branch = 'main';

// Función para encontrar la ruta local correcta del archivo
const findLocalPath = (remotePath) => {
  const possiblePaths = [
    remotePath,                          // Ruta directa
    `./${remotePath}`,                   // Con ./
    path.join(process.cwd(), remotePath), // Directorio actual
    path.join('./plugins', remotePath),   // En carpeta plugins
    path.join('./lib', path.basename(remotePath)), // En lib si es un archivo
  ];
  
  for (const testPath of possiblePaths) {
    try {
      if (fs.existsSync(testPath)) {
        return testPath;
      }
    } catch (error) {
      continue;
    }
  }
  
  return null; // No se encontró el archivo localmente
};

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
    
    // Comparar archivos modificados con los locales
    let comparisonResults = [];
    
    for (const file of files.slice(0, 3)) { // Limitar a los primeros 3 archivos para no saturar
      const remotePath = file.filename;
      const localPath = findLocalPath(remotePath);
      
      if (!localPath) {
        comparisonResults.push(`❓ "${remotePath}" no se encontró localmente`);
        continue;
      }
      
      try {
        // Obtener contenido remoto
        const rawURL = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${remotePath}`;
        const { data: remoteContent } = await axios.get(rawURL);
        
        // Leer archivo local
        const localContent = fs.readFileSync(localPath, 'utf8');
        
        // Comparar contenido
        if (remoteContent.trim() === localContent.trim()) {
          comparisonResults.push(`✅ "${remotePath}" está actualizado`);
        } else {
          comparisonResults.push(`⚠️ "${remotePath}" es diferente localmente`);
        }
      } catch (error) {
        comparisonResults.push(`❌ Error al comparar "${remotePath}"`);
      }
    }
    
    const comparisonText = comparisonResults.length > 0 
      ? `\n🔍 Comparación con archivos locales:\n${comparisonResults.join('\n')}`
      : '';
    
    const text = `📢 Nueva actualización detectada:\n\n` +
      `🔹 Autor: ${login}\n` +
      `🔹 Mensaje: ${message}\n` +
      `🔹 Archivos cambiados:\n${filesChanged}` +
      `${comparisonText}\n\n` +
      `💡 Si tienes la función de auto-actualización activa, **reinicia el bot** para que los cambios se apliquen.`;
    
    await conn.sendMessage(m.chat, { text }, { quoted: m });
    
  } catch (error) {
    console.error('Error en el comando de actualización:', error);
    await conn.sendMessage(m.chat, { 
      text: '❌ Error al consultar el repositorio o comparar archivos. Intenta más tarde.\n\nDetalles del error: ' + error.message 
    }, { quoted: m });
  }
};

handler.command = /^(actualizacion|actualizaciones)$/i;
handler.rowner = true;
export default handler;
