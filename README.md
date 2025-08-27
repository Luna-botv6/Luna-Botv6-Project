# 🌙GB-Bot-MD Luna-Bot V6 - WhatsApp Bot

<div align="center">
  <img src="https://raw.githubusercontent.com/Luna-botv6/Luna-botv6/main/IMG-20250519-WA0115.jpg" alt="Luna Bot Logo" width="400" style="border-radius: 25px; box-shadow: 0 0 30px rgba(255, 215, 0, 0.6); animation: pulse 2s infinite; border: 4px solid linear-gradient(45deg, #FFD700, #FFA500);"/>
  
  **Luna Bot es un bot avanzado y altamente personalizable para WhatsApp, diseñado para ofrecerte una experiencia completa con herramientas útiles, entretenimiento, moderación y comandos inteligentes.**
</div>
  

---

## 📋 Tabla de Contenidos

- [🌟 Características](#-características)
- [📦 Instalación](#-instalación)
- [⚙️ Configuración](#️-configuración)
- [🚀 Uso](#-uso)
- [📁 Estructura del Proyecto](#-estructura-del-proyecto)
- [🔧 Requisitos del Sistema](#-requisitos-del-sistema)
- [🌐 Despliegue](#-despliegue)
- [🤝 Contribuir](#-contribuir)
- [📞 Soporte](#-soporte)
- [👨‍💻 Creador](#-creador)
- [📄 Licencia](#-licencia)

---

## 🌟 Características

### 🎮 **Entretenimiento**
- Sistema de juegos completo (ahorcado, piedra/papel/tijera, tic-tac-toe)
- Máquina tragamonedas con sistema de recompensas
- Comandos de diversión y memes
- Sistema de niveles y experiencia

### 🛠️ **Herramientas Útiles**
- Descarga de contenido multimedia (YouTube, TikTok, Instagram)
- Generación y lectura de códigos QR
- Convertidor de stickers y multimedia
- Traductor multiidioma
- Información del clima

### 🛡️ **Moderación Avanzada**
- Sistema antispam inteligente
- Control de enlaces y contenido
- Gestión automática de grupos
- Sistema de advertencias
- Filtros personalizables

### 💎 **Economía Virtual**
- Sistema de minería de diamantes
- Economía interna con monedas virtuales
- Tienda de objetos y mejoras
- Sistema bancario integrado

### 🤖 **Funciones Inteligentes**
- IA integrada para conversaciones
- Respuestas automáticas personalizables
- Sistema AFK (Away From Keyboard)
- Comandos de información y estadísticas

---

## 📦 Instalación

### 🐧 **Linux (Recomendado)**

```bash
# Clonar el repositorio
git clone https://github.com/Luna-botv6/Luna-Botv6-Project.git
cd Luna-Botv6-Project

# Instalar dependencias del sistema
sudo apt update
sudo apt install nodejs npm python3 ffmpeg imagemagick

# Instalar dependencias del proyecto
npm install

# Configurar el bot
cp config.example.js config.js
nano config.js
```

### 🪟 **Windows**

```powershell
# Clonar el repositorio
git clone https://github.com/Luna-botv6/Luna-Botv6-Project.git
cd Luna-Botv6-Project

# Instalar dependencias (requiere chocolatey)
choco install nodejs python3 ffmpeg imagemagick

# Instalar dependencias del proyecto
npm install

# Configurar el bot
copy config.example.js config.js
notepad config.js
```

### 📱 **Android (Termux)**

```bash
# 1. Instala Termux desde la Play Store:
# https://play.google.com/store/apps/details?id=com.termux
# 2. Abre Termux y actualiza los paquetes del sistema:
pkg update && pkg upgrade -y
# 3. Instala Node.js, Git, Python y herramientas necesarias:
pkg install nodejs git python make clang pkg-config -y
# 4. Clona el repositorio oficial del bot:
git clone https://github.com/Luna-botv6/Luna-Botv6-Project.git
# 5. Accede a la carpeta del proyecto:
cd Luna-Botv6-Project
# 6. Instala las dependencias del proyecto:
npm install
# 7. Elimina puppeteer (no es compatible con Termux):
npm uninstall puppeteer
# 8. Instala herramientas adicionales y dependencias específicas:
pkg install libvips ffmpeg imagemagick -y
npm install fs-extra
npm install wa-sticker-formatter --force --legacy-peer-deps
# 9. Abre y edita el archivo config.js para configurar tus datos:
nano config.js
```

Abre el archivo config.js y reemplaza estas líneas con tus datos reales:

```js
global.owner = ['5491122334455']
global.mods = ['5491122334455']
global.lid = ['12345678901234@']
```

Para obtener tu LID: envíale al bot el comando `/miid`. Si te responde con `@s.whatsapp.net`, crea un grupo temporal, añade el bot, y vuelve a usar `/miid` hasta que te devuelva un ID con `@lid`.

Para guardar y salir de nano: presiona `Volumen Abajo + O`, Enter para guardar, y luego `Volumen Abajo + X` para salir.

```bash
# 10. Inicia el bot:
npm start
```

### 🍎 **macOS**

```bash
# Clonar el repositorio
git clone https://github.com/Luna-botv6/Luna-Botv6-Project.git
cd Luna-Botv6-Project

# Instalar dependencias (requiere Homebrew)
brew install node python3 ffmpeg imagemagick

# Instalar dependencias del proyecto
npm install

# Configurar el bot
cp config.example.js config.js
nano config.js
```

---

## ⚙️ Configuración

### 📝 **Configuración Básica**

Edita el archivo `config.js` con tus datos:

```javascript
global.owner = [
  ['5493483466763', 'Germán Miño', true],
  ['5493483466763']
]
global.lidOwners = [
  "128213666649",
  "297166688532",
];

global.mods = ['5493483466763']
global.prems = ['5493483466763']

global.packname = 'Luna Bot'
global.author = 'Germán Miño'
global.wm = 'Luna Bot V6 - Created by Germán Miño'

// Configuración de la base de datos
global.db = './database/database.json'

// APIs (opcional)
global.APIs = {
  nrtm: 'https://nurutomo.herokuapp.com',
  xteam: 'https://api.xteam.xyz',
  // Agrega más APIs según necesites
}
```

### 🔒 **Configuración de Seguridad**

> **⚠️ IMPORTANTE:** Asegúrate de agregar tu número en las siguientes ubicaciones para evitar ser bloqueado por el sistema antispam:

1. **config.js** - En la sección `global.owner`
2. **plugins/antispam.js** - En el array de números permitidos

---

## 🚀 Uso

### 🖥️ **Iniciar el Bot**

```bash
# Iniciar normalmente
npm start

# Iniciar con PM2 (recomendado para producción)
npm install -g pm2
pm2 start main.js --name "LunaBot"

# Ver logs con PM2
pm2 logs LunaBot
```

### 📱 **Conexión a WhatsApp**

1. Ejecuta el bot con `npm start`
2. Escanea el código QR que aparece en la terminal con WhatsApp Web
3. ¡El bot estará listo para usar!

### 📋 **Comandos Principales**

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| `.menu` | Muestra el menú principal | `.menu` |
| `.help` | Ayuda sobre comandos | `.help play` |
| `.ping` | Verifica la latencia | `.ping` |
| `.info` | Información del bot | `.info` |

---

## 📁 Estructura del Proyecto

```
Luna-Botv6-Project/
├── 📁 database/          # Base de datos guarda stats.js
│   ├── afkDB.json
│   ├── levelling.json
│   └── ...
├── 📁 lib/               # Librerías principales
│   ├── exp.js           # Sistema de experiencia
│   ├── levelling.js     # Sistema de niveles
│   └── stats.js         # sistema de guardado de exp,money etc

├── 📁 plugins/          # Comandos del bot
│   ├── game-*.js        # Juegos
│   ├── tools-*.js       # Herramientas
│   ├── admin-*.js       # Administración
│   └── ...
├── 📁 MysticSession/    # Sesión de WhatsApp
├── 📄 creds.json           # Archivo principal
├── 📄 pre-key        # claves 
├── 📄 sender-key         # claves 
└── 📄 session    # claves

├── 📁 src/
├──📁 libraries/prints.js   # logs 

```

---

## 🔧 Requisitos del Sistema

### 📋 **Requisitos Mínimos**

| Componente | Versión | Descripción |
|------------|---------|-------------|
| **Node.js** | v18+ | Motor de JavaScript |
| **NPM** | v8+ | Gestor de paquetes |
| **Python** | v3.8+ | Para módulos específicos |
| **FFmpeg** | Latest | Procesamiento multimedia |
| **ImageMagick** | Latest | Manipulación de imágenes |
| **RAM** | 700MB | Memoria mínima |
| **Almacenamiento** | 3GB | Espacio libre |

### 🌐 **Requisitos de Red**

- Conexión estable a internet
- Puerto 80/443 abierto (para webhooks)
- Latencia baja para mejor rendimiento

---

## 🌐 Despliegue

### ☁️ **Despliegue en la Nube**

#### 📷 **BoxMineWorld (Recomendado)**

<div align="center">
  <a href="https://boxmineworld.com">
    <img width="200px" src="https://boxmineworld.com/img/Logo.png" alt="BoxMineWorld"/>
  </a>
</div>

**Enlaces Importantes:**
- 🌐 **Sitio Web:** [boxmineworld.com](https://boxmineworld.com)
- 👤 **Panel de Cliente:** [dash.boxmineworld.com](https://dash.boxmineworld.com)
- ⚙️ **Panel de Control:** [panel.boxmineworld.com](https://panel.boxmineworld.com)
- 📚 **Documentación:** [docs.boxmineworld.com](https://docs.boxmineworld.com)
- 💬 **Discord:** [Únete aquí](https://discord.gg/84qsr4v)

#### 📷 **Otras Plataformas**

- **Heroku:** [![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)
- **Railway:** [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app)
- **Render:** Compatible con configuración manual

---

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Sigue estos pasos:

1. 🍴 Fork el proyecto
2. 🌿 Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. 📝 Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. 📤 Push a la rama (`git push origin feature/AmazingFeature`)
5. 📄 Abre un Pull Request

### 📋 **Guías de Contribución**

- Sigue las convenciones de código existentes
- Documenta los nuevos comandos
- Prueba tu código antes de enviarlo
- Respeta la estructura modular del proyecto

---

## 📞 Soporte

### 💬 **Canal Oficial de WhatsApp**

**Únete para recibir actualizaciones y soporte:**

[![WhatsApp Channel](https://img.shields.io/badge/WhatsApp-Channel-25D366?style=for-the-badge&logo=whatsapp)](https://whatsapp.com/channel/0029VbANyNuLo4hedEWlvJ3Y)

### 🐛 **Reportar Bugs**

- 📝 [Crear Issue](https://github.com/Luna-botv6/Luna-Botv6-Project/issues/new?template=bug_report.md)
- 💡 [Solicitar Feature](https://github.com/Luna-botv6/Luna-Botv6-Project/issues/new?template=feature_request.md)

---

## 👨‍💻 Creador

<div align="center">
  
### 🌙 **Germán Miño**
*Creador y Desarrollador Principal de Luna Bot V6*

[![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://wa.me/5493483466763)
[![Discord](https://img.shields.io/badge/Discord-7289DA?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/users/german_coto)
[![Email](https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:lunabotv6@gmail.com)

**📱 WhatsApp:** `+54 9 348 346 6763`  
**💬 Discord:** `german_coto`  
**📧 Email:** `lunabotv6@gmail.com`

</div>

---

## 🙏 Reconocimientos

Este proyecto está basado en el excelente trabajo de:

- **[Mystic-Bot-MD](https://github.com/BrunoSobrino/TheMystic-Bot-MD)** por [Bruno Sobrino](https://github.com/BrunoSobrino

Un agradecimiento especial a todos los colaboradores y la comunidad que hace posible este proyecto.

---

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

---

## ⭐ ¿Te gusta el proyecto?

Si Luna Bot te ha sido útil, considera:

- ⭐ Darle una estrella al repositorio
- 🍴 Fork el proyecto
- 📢 Compartirlo con otros
- ☕ [Apoyar al desarrollador](https://wa.me/5493483466763)

---

<div align="center">
  
  **🌙 Hecho con ❤️ por Germán Miño para la comunidad de WhatsApp**
  
  [![GitHub](https://img.shields.io/badge/GitHub-Luna--Bot-black?style=flat-square&logo=github)](https://github.com/Luna-botv6/Luna-Botv6-Project)
  [![WhatsApp](https://img.shields.io/badge/WhatsApp-Channel-25D366?style=flat-square&logo=whatsapp)](https://whatsapp.com/channel/0029VbANyNuLo4hedEWlvJ3Y)
  
</div>
