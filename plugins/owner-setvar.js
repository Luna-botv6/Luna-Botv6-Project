import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Uboicaciones
const configPath = path.join(__dirname, '../config.js');
const gitignorePath = path.join(__dirname, '../.gitignore');

const ensureConfigIgnored = async () => {
  try {
    let gitignoreContent = '';

    if (fs.existsSync(gitignorePath)) {
      gitignoreContent = await fs.promises.readFile(gitignorePath, 'utf-8');
    }

    if (!gitignoreContent.includes('config.js')) {
      gitignoreContent += '\nconfig.js\n';
      await fs.promises.writeFile(gitignorePath, gitignoreContent, 'utf-8');
      console.log('✅ config.js añadido a .gitignore');
    }
  } catch (error) {
    throw new Error(`❌ .gitignore ${error.message}`);
  }
};

const updateConfigFile = async (variable, value) => {
  try {
    let configContent = await fs.promises.readFile(configPath, 'utf-8');

    const cleanVariable = variable.replace(/^global\./, '');

    const variablePattern = new RegExp(`(^|\\n)global\\.${cleanVariable}\\s*=\\s*['"\`].*?['"\`];?`, 'm');

    const formattedValue = /^['"`].*['"]$/.test(value) ? value : `'${value}'`;

    if (variablePattern.test(configContent)) {
      configContent = configContent.replace(variablePattern, `global.${cleanVariable} = ${formattedValue};`);
    } else {
      configContent += `\nglobal.${cleanVariable} = ${formattedValue};\n`;
    }

    await fs.promises.writeFile(configPath, configContent, 'utf-8');
  } catch (error) {
    throw new Error(`❌ ${error.message}`);
  }
};

const handler = async (m, { text }) => {
  const _tr = await global.loadTranslation(global.getIdioma?.(m) || 'es');
  const t = _tr?.plugins?.owner_setvar || {};
  if (!text) return m.reply((t.ejemplo1 || '❌ Ej .setvar global.groq = gsk'));

  const [variable, value] = text.split('=').map(item => item.trim());

  if (!variable || !value) return m.reply((t.ejemplo2 || '❌ Ej .setvar variable = valor'));

  try {
    await ensureConfigIgnored(); 
    await updateConfigFile(variable, value); 
    m.reply((t.actualizada?.replace('{variable}', variable.replace(/^global\./, '')).replace('{valor}', value) || `✅ ${variable.replace(/^global\./, '')} actualizada a ${value}`));
  } catch (error) {
    console.error('❌ Error al actualizar config.js:', error);
    m.reply((t.error?.replace('{error}', error.message) || `❌ ${error.message}`));
  }
};

handler.command = /^setvar$/i; 
handler.help = ['cambia ajustes'];
handler.tags = ['tools'];
handler.owner = true; 

export default handler;
