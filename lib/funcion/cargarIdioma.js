import fs from 'fs';

export async function cargarIdioma(idioma, clave) {
  const lang = idioma || global.defaultLenguaje || 'es';
  try {
    if (typeof global.loadTranslation === 'function') {
      const t = await global.loadTranslation(lang);
      if (t?.plugins?.[clave]) return t;
      if (lang !== 'es') {
        const alternativo = await global.loadTranslation('es');
        if (alternativo?.plugins?.[clave]) return alternativo;
      }
      return t;
    }
  } catch {}
  let t = {};
  try {
    t = JSON.parse(fs.readFileSync(`./src/lunaidiomas/${lang}.json`, 'utf8'));
  } catch {
    try { t = JSON.parse(fs.readFileSync('./src/lunaidiomas/es.json', 'utf8')); } catch {}
  }
  return t;
}
