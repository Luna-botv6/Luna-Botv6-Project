import { execSync } from 'child_process';

const handler = async (m, { conn, text }) => {
  // Verificar si es un repositorio Git
  try {
    execSync('git rev-parse --git-dir', { stdio: 'ignore' });
  } catch {
    // Si no es un repositorio Git, inicializarlo y configurar el remoto
    try {
      await conn.reply(m.chat, '🔧 Inicializando repositorio Git...', m);
      execSync('git init');
      execSync('git remote add origin https://github.com/Luna-botv6/Luna-Botv6-Project.git');
      execSync('git fetch origin');
      execSync('git checkout -b main');
      execSync('git reset --hard origin/main');
      await conn.reply(m.chat, '✅ Repositorio Git inicializado correctamente.', m);
    } catch (initError) {
      await conn.reply(m.chat, `❌ Error al inicializar el repositorio Git:\n${initError.message}`, m);
      return;
    }
  }

  try {
    // Verificar si se solicita forzar la actualización
    const forceUpdate = text && text.includes('--force');
    const commitChanges = text && text.includes('--commit');
    
    if (forceUpdate) {
      await conn.reply(m.chat, '⚠️ Forzando actualización... Se perderán los cambios locales.', m);
      execSync('git reset --hard HEAD');
      execSync('git clean -fd');
    }
    
    // Si se solicita hacer commit de los cambios locales
    if (commitChanges) {
      try {
        await conn.reply(m.chat, '💾 Guardando cambios locales...', m);
        execSync('git add .');
        execSync('git commit -m "Guardar cambios locales antes de actualizar"');
        await conn.reply(m.chat, '✅ Cambios locales guardados correctamente.', m);
      } catch (commitError) {
        await conn.reply(m.chat, '⚠️ No hay cambios para guardar o ya están guardados.', m);
      }
    }
    
    // Verificar si hay actualizaciones disponibles
    await conn.reply(m.chat, '🔍 Verificando actualizaciones...', m);
    
    // Obtener información del repositorio remoto
    execSync('git fetch origin');
    
    // Obtener el hash del commit local
    const localCommit = execSync('git rev-parse HEAD').toString().trim();
    
    // Obtener el hash del commit remoto
    const remoteCommit = execSync('git rev-parse origin/main').toString().trim();
    
    // Comparar commits
    if (localCommit === remoteCommit && !forceUpdate) {
      await conn.reply(m.chat, '✅ El bot ya está actualizado. No hay nuevas actualizaciones disponibles.', m);
      return;
    }
    
    // Si hay diferencias, mostrar información sobre las actualizaciones
    if (!forceUpdate) {
      try {
        const commitCount = execSync(`git rev-list --count ${localCommit}..${remoteCommit}`).toString().trim();
        await conn.reply(m.chat, `📥 Se encontraron ${commitCount} actualizaciones disponibles. Descargando...`, m);
      } catch {
        await conn.reply(m.chat, '📥 Se encontraron actualizaciones disponibles. Descargando...', m);
      }
    }
    
    // Realizar el pull
    const stdout = execSync('git pull origin main');
    let messager = stdout.toString();
    
    if (messager.includes('Already up to date.')) {
      messager = '✅ El bot ya está actualizado.';
    } else if (messager.includes('Updating') || messager.includes('Fast-forward')) {
      messager = '🔄 Bot actualizado exitosamente!\n```\n' + stdout.toString() + '\n```';
    } else {
      messager = '✅ Actualización completada:\n```\n' + stdout.toString() + '\n```';
    }
    
    conn.reply(m.chat, messager, m);
    
  } catch (error) {      
    try {    
      const status = execSync('git status --porcelain');
      if (status.length > 0) {
        const conflictedFiles = status
          .toString()
          .split('\n')
          .filter(line => line.trim() !== '')
          .map(line => {
            // Ignorar archivos temporales, de caché, y carpetas específicas
            if (line.includes('.npm/') || 
                line.includes('.cache/') || 
                line.includes('tmp/') || 
                line.includes('MysticSession/') || 
                line.includes('npm-debug.log') ||
                line.includes('node_modules/') ||
                line.includes('database/') ||
                line.includes('qr_database.json') ||
                line.includes('copia-niveles.js') ||
                line.includes('database.json') ||
                line.includes('package-lock.json') ||
                /_database\.json$/.test(line)) {
              return null;
            }
            return '*→ ' + line.slice(3) + '*';
          })
          .filter(Boolean);
        
        if (conflictedFiles.length > 0) {
          const errorMessage = `❌ Error: Hay archivos modificados que impiden la actualización:\n\n${conflictedFiles.join('\n')}\n\n💡 **Opciones disponibles:**\n• \`.gitpull --force\` - Forzar actualización (elimina cambios locales)\n• \`.gitpull --commit\` - Guardar cambios locales y luego actualizar`;
          await conn.reply(m.chat, errorMessage, m);  
        } else {
          // Si no hay archivos conflictivos después del filtro, intentar la actualización de nuevo
          try {
            const stdout = execSync('git pull origin main');
            const messager = '✅ Actualización completada:\n```\n' + stdout.toString() + '\n```';
            conn.reply(m.chat, messager, m);
          } catch (pullError) {
            await conn.reply(m.chat, '❌ Error inesperado durante la actualización.', m);
          }
        }
      }
    } catch (statusError) {
      console.error(statusError);
      let errorMessage2 = '❌ Error al actualizar el bot.';
      if (statusError.message) {
        errorMessage2 += '\n*- Mensaje de error:* ' + statusError.message;
      }
      await conn.reply(m.chat, errorMessage2, m);
    }
  }
};

handler.command = /^(gitpull)$/i;
handler.rowner = true;
export default handler;
