# Luna-Botv6-Project
Luna es un bot de WhatsApp avanzado y personalizable, diseñado para ofrecer herramientas útiles, entretenimiento, funciones de moderación y comandos inteligentes, todo en una interfaz amigable y adaptable.

Requisitos y Características del Proyecto LunaBotV6
LunaBotV6 es un bot de WhatsApp altamente personalizado, basado originalmente en
TheMystic-Bot-MD y adaptado progresivamente para usar la versión moderna de Baileys utilizada
por GataBot-MD.
== REQUISITOS ==
1. Node.js v18+.
2. ffmpeg y imagemagick instalados (para funciones de stickers, audios y multimedia).
3. Python 3 (solo si usas funciones que requieren módulos como whisper o lectura de QR).
4. Instalación de dependencias:
 - Ejecutar `npm install` en la raíz del proyecto.
5. Conexión estable a internet.
6. Sistema operativo recomendado: Linux (aunque puede funcionar en Windows con ajustes).
== CAMBIOS Y MEJORAS APLICADAS ==
- Migración completa del bot a @whiskeysockets/baileys.
- Implementación del sistema de autenticación moderno con `useSingleFileAuthState`.
- Eliminación del uso de `qr_database.json`. Ahora el QR se muestra en consola
(`printQRInTerminal: true`).
- Nueva estructura de base de datos distribuida (cada módulo tiene su propio archivo JSON en la
carpeta `database/`).
- Separación de los datos persistentes (AFK, niveles, economía, funciones, etc.) de la carpeta de
sesión `MysticSession`.
- Implementación del sistema de experiencia centralizada usando `lib/exp.js`, que acumula la EXP
de múltiples comandos como `minar`, `cazar`, etc.
- Incorporación de un sistema de auto-limpieza de archivos TPM (Temporales).
- Limpieza automática de archivos de claves (key de cifrado) usada por Baileys.
 - Esto ocurre cada hora.
 - Durante ese proceso, el bot puede tardar unos segundos en responder mientras genera nuevas
claves.
 - Después de este breve retardo, el bot vuelve a operar con normalidad.
- Personalización del menú visual (`menus-menu.js`) 

== NOTAS ADICIONALES ==
- El bot soporta comandos divididos en plugins temáticos (juegos, herramientas, administración,
multimedia, etc.).
- Compatible con grupos y usuarios individuales.
- El proyecto sigue una filosofía modular: todos los cambios están orientados a facilitar
mantenibilidad, escalabilidad y estabilidad.
== UBICACIÓN DE ARCHIVOS CLAVE ==
- Archivos nuevos: `afkDB.js,ahorcado.js,antispamDB.js,canvas.js,exp.js,levelling.js,menu.js,minar.js,minardiamantes.js,ppt.js,slot.js,stats.js,tictactoe-db.js`
- Archivos principales: `main.js`, `handler.js`, `config.js`, `index.js`
- Carpeta de base de datos modular: `database/`
- Carpeta de sesión: `MysticSession` (solo contiene sesión activa, no datos persistentes)

IMPORTANTE:

1. Edita el archivo 'config.js' y coloca tu número en la sección correspondiente.
2. En la carpeta 'plugins/antispam.js', añade también tu número.

LunaBot cuenta con un sistema antispam personalizado. Si no agregas tu número, el bot podría bloquearte automáticamente.

NOTA:

Todas las actualizaciones, nuevos comandos y funciones de LunaBot se anunciarán exclusivamente desde la página oficial en WhatsApp.

Únete aquí para estar al tanto de todo:  
https://whatsapp.com/channel/0029VbANyNuLo4hedEWlvJ3Y

## Despliegue en BoxMineWorld

<a href="https://boxmineworld.com">

<img width="180px"

src="https://boxmineworld.com/img/Logo.png" />

</a>

<details>

<summary><b>: paperclip: Enlaces

Importantes</b></summary>

**Sitio Web:**

[boxmineworld.com](https://boxmineworld .com)

**Área de Clientes:**

[dash.boxmineworld.com](https://dash .boxmineworld.com)

**Panel de Control: **

[panel.boxmineworld.com] (https://panel boxmineworld.com)

**Documentación:**

[docs.boxmineworld.com](https://docs boxmineworld.com)

**Comunidad de Discord:** [¡Únete aquí!]

(https://discord.gg/84qsr4v)

</details>
