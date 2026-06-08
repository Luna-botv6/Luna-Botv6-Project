import axios from 'axios';
import fs from 'fs';
import path from 'path';

let lastCommitSHA = '';
const owner = 'Luna-botv6';
const repo = 'Luna-Botv6-Project';
const branch = 'main';
const RATE_LIMIT_DELAY = 2000; // 2 segundos entre solicitudes para respetar límites de API
const MAX_FILES_TO_CHECK = 10; // Máximo archivos a comparar para evitar saturar WhatsApp
const MAX_MESSAGE_LENGTH = 4000; // Límite de caracteres para WhatsApp

// Función para encontrar la ruta local correcta del archivo
const findLocalPath = (remotePath) => {
  const possiblePaths = [
    remotePath,
    `./${remotePath}`,
    path.join(process.cwd(), remotePath),
    path.join('./plugins', remotePath),
    path.join('./lib', path.basename(remotePath)),
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
  
  return null;
};

// Función para hacer delay entre requests (respeta rate limits)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Función para truncar texto si es muy largo
const truncateText = (text, maxLength) => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
};

const handler = async (m, { conn }) => {
  try {
    // Mensaje inicial de búsqueda
    await conn.sendMessage(m.chat, { 
      text: '🔍 Buscando actualizaciones en el repositorio...\n⏳ Esto puede tomar unos segundos.' 
    }, { quoted: m });
    
    // Obtener commits recientes (últimos 5 para ver si hay múltiples actualizaciones)
    const { data: commits } = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`
    );
    
    if (!commits || commits.length === 0) {
      return conn.sendMessage(m.chat, { 
        text: '❌ No se pudieron obtener los commits del repositorio.' 
      }, { quoted: m });
    }
    
    const latestCommit = commits[0];
    const { sha, commit: { message, author: commitAuthor }, author } = latestCommit;
    const login = author?.login || commitAuthor?.name || 'Desconocido';
    const commitDate = new Date(commitAuthor?.date).toLocaleString('es-ES');
    
    // Si no hay nuevas actualizaciones
    if (sha === lastCommitSHA) {
      return conn.sendMessage(m.chat, { 
        text: '✅ No hay nuevas actualizaciones desde la última revisión.\n\n💡 El bot está actualizado.' 
      }, { quoted: m });
    }
    
    // Actualizar el último SHA conocido
    lastCommitSHA = sha;
    
    // Obtener detalles del commit actual
    await delay(RATE_LIMIT_DELAY);
    const { data: commitDetails } = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/commits/${sha}`
    );
    
    const files = commitDetails.files || [];
    
    // Procesar TODOS los archivos modificados
    let filesChanged = '';
    if (files.length > 0) {
      const filesList = files.map(f => {
        const statusEmoji = {
          'added': '➕',
          'modified': '✏️',
          'removed': '❌',
          'renamed': '🔄'
        };
        return `${statusEmoji[f.status] || '📝'} ${f.filename}`;
      });
      
      filesChanged = filesList.join('\n');
      
      // Si hay demasiados archivos, resumir
      if (files.length > 15) {
        const firstFiles = filesList.slice(0, 10).join('\n');
        filesChanged = `${firstFiles}\n... y ${files.length - 10} archivos más`;
      }
    } else {
      filesChanged = 'No se encontraron archivos modificados.';
    }
    
    // Comparar archivos con versión local (limitado para no saturar)
    let comparisonResults = [];
    const filesToCheck = files.slice(0, MAX_FILES_TO_CHECK);
    
    if (filesToCheck.length > 0) {
      await conn.sendMessage(m.chat, { 
        text: `🔍 Comparando ${filesToCheck.length} archivos con la versión local...` 
      }, { quoted: m });
      
      for (let i = 0; i < filesToCheck.length; i++) {
        const file = filesToCheck[i];
        const remotePath = file.filename;
        const localPath = findLocalPath(remotePath);
        
        if (!localPath) {
          comparisonResults.push(`❓ "${path.basename(remotePath)}" - Archivo nuevo o no encontrado localmente`);
          continue;
        }
        
        try {
          // Obtener contenido remoto con delay para respetar rate limits
          if (i > 0) await delay(RATE_LIMIT_DELAY);
          
          const rawURL = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${remotePath}`;
          const { data: remoteContent } = await axios.get(rawURL);
          
          // Leer archivo local
          const localContent = fs.readFileSync(localPath, 'utf8');
          
          // Comparar contenido
          if (remoteContent.trim() === localContent.trim()) {
            comparisonResults.push(`✅ "${path.basename(remotePath)}" - Actualizado`);
          } else {
            comparisonResults.push(`⚠️ "${path.basename(remotePath)}" - Versión local diferente`);
          }
          
        } catch (error) {
          comparisonResults.push(`❌ "${path.basename(remotePath)}" - Error al comparar`);
        }
      }
    }
    
    // Construir mensaje final
    let responseText = '📢 Nueva actualización detectada\n\n';
    responseText += `👤 Autor: ${login}\n`;
    responseText += `📅 Fecha: ${commitDate}\n`;
    responseText += `💬 Mensaje: ${truncateText(message, 200)}\n\n`;
    responseText += `📁 Archivos modificados (${files.length}):\n${filesChanged}\n\n`;
    
    if (comparisonResults.length > 0) {
      responseText += `🔍 Estado local:\n${comparisonResults.join('\n')}\n\n`;
    }
    
    // Verificar si hay commits adicionales recientes
    if (commits.length > 1) {
      const recentCommits = commits.slice(1, 3).map(c => 
        `• ${c.commit.message.split('\n')[0]} (${c.author?.login || 'Desconocido'})`
      );
      responseText += `📋 Commits recientes:\n${recentCommits.join('\n')}\n\n`;
    }
    
    responseText += '💡 Para aplicar cambios: reinicia el bot si tienes auto-actualización activa.';
    
    // Truncar mensaje si es muy largo para WhatsApp
    responseText = truncateText(responseText, MAX_MESSAGE_LENGTH);
    
    await conn.sendMessage(m.chat, { text: responseText }, { quoted: m });
    
  } catch (error) {
    console.error('Error en comando de actualización:', error);
    
    let errorMessage = '❌ Error al consultar el repositorio.';
    
    // Manejo específico de errores
    if (error.response?.status === 403) {
      errorMessage += '\n⚠️ Límite de API alcanzado. Intenta en unos minutos.';
    } else if (error.response?.status === 404) {
      errorMessage += '\n🔍 Repositorio no encontrado o privado.';
    } else if (error.code === 'ENOTFOUND') {
      errorMessage += '\n🌐 Sin conexión a internet.';
    } else {
      errorMessage += `\n📋 Error: ${error.message}`;
    }
    
    await conn.sendMessage(m.chat, { text: errorMessage }, { quoted: m });
  }
};

handler.command = /^(actualizacion|actualizaciones|update|updates)$/i;
handler.rowner = true; // Solo para el propietario del bot

export default handler;
