<div align="center">
<img width="100%" src="./src/luna_bot_header.svg" alt="Luna Bot V6"/>
<img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=600&size=28&pause=1000&color=FFD700&center=true&vCenter=true&width=600&lines=🌙+Bot+Avanzado+de+WhatsApp;✨+Altamente+Personalizable;🚀+Herramientas+%2B+Entretenimiento;💎+Moderación+Inteligente" alt="Typing SVG" />

<br><br>

<a href="https://github.com/Luna-botv6/Luna-Botv6-Project">
  <img src="https://raw.githubusercontent.com/Luna-botv6/Luna-botv6/main/IMG-20250519-WA0115.jpg" alt="Luna Bot Logo" width="400" style="border-radius: 25px;"/>
</a>

<br><br>

<p>
  <a href="https://github.com/Luna-botv6/Luna-Botv6-Project">
    <img src="https://img.shields.io/badge/🌙%20Version-6.0%20LATEST-8B5CF6?style=for-the-badge&logo=github&logoColor=white&labelColor=5B21B6" alt="Version"/>
  </a>
  <a href="https://nodejs.org">
    <img src="https://img.shields.io/badge/⚡%20Node.js-v18%2B-10B981?style=for-the-badge&logo=nodedotjs&logoColor=white&labelColor=065F46" alt="Node"/>
  </a>
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/📜%20License-MIT-FCD34D?style=for-the-badge&logo=opensourceinitiative&logoColor=white&labelColor=92400E" alt="License"/>
  </a>
</p>

<p>
  <a href="https://whatsapp.com/channel/0029VbANyNuLo4hedEWlvJ3Y">
    <img src="https://img.shields.io/badge/💬%20WhatsApp-Bot%20Oficial-25D366?style=for-the-badge&logo=whatsapp&logoColor=white&labelColor=128C7E" alt="WhatsApp"/>
  </a>
  <img src="https://img.shields.io/badge/🔥%20Estado-ACTIVO-EC4899?style=for-the-badge&logo=statuspage&logoColor=white&labelColor=9F1239" alt="Status"/>
  <img src="https://img.shields.io/badge/⭐%20Calidad-Premium-FFD700?style=for-the-badge&logo=starship&logoColor=white&labelColor=B45309" alt="Quality"/>
</p>

<br>

<table>
<tr>
<td align="center">

---

## 💫 **La Experiencia Definitiva en WhatsApp**

```js
const LunaBot = {
  caracteristicas: [
    "✨ Bot avanzado y altamente personalizable",
    "🎯 Herramientas útiles para el día a día",
    "🎮 Entretenimiento sin límites",
    "🛡️ Moderación inteligente de grupos",
    "🤖 Comandos inteligentes con IA",
    "⚡ Respuestas rápidas y eficientes"
  ],
  estado: "🔥 ACTIVO",
  version: "6.0.0"
};
```

---

</td>
</tr>
</table>

<br>

<table>
<tr>
<td align="center" width="25%">
  <img src="https://img.shields.io/badge/🛠️-HERRAMIENTAS-8B5CF6?style=flat-square&labelColor=5B21B6" width="100%"/>
  <br><sub><b>Útiles y Prácticas</b></sub>
</td>
<td align="center" width="25%">
  <img src="https://img.shields.io/badge/🎮-JUEGOS-10B981?style=flat-square&labelColor=065F46" width="100%"/>
  <br><sub><b>Entretenimiento Total</b></sub>
</td>
<td align="center" width="25%">
  <img src="https://img.shields.io/badge/🛡️-MODERACIÓN-EC4899?style=flat-square&labelColor=9F1239" width="100%"/>
  <br><sub><b>Control de Grupos</b></sub>
</td>
<td align="center" width="25%">
  <img src="https://img.shields.io/badge/🤖-IA-FCD34D?style=flat-square&labelColor=92400E" width="100%"/>
  <br><sub><b>Inteligencia Artificial</b></sub>
</td>
</tr>
</table>

<br>

<p>
  <img src="https://img.shields.io/github/stars/Luna-botv6/Luna-Botv6-Project?style=social" alt="GitHub stars"/>
  <img src="https://img.shields.io/github/forks/Luna-botv6/Luna-Botv6-Project?style=social" alt="GitHub forks"/>
  <img src="https://img.shields.io/github/watchers/Luna-botv6/Luna-Botv6-Project?style=social" alt="GitHub watchers"/>
</p>

<img src="https://komarev.com/ghpvc/?username=Luna-botv6&label=Visitas&color=blueviolet&style=for-the-badge" alt="Profile views"/>

<br><br>

<img width="100%" src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=100&section=footer"/>

</div>

---

## 🆕 Últimas Actualizaciones

<table>
<tr>
<td>

## ✅ 25/03/2026 – Optimización Profunda del Core del Bot 🚀

### 🧠 handler.js
- ✅ Checks de `admin` y `botAdmin` corregidos (estaban invertidos, siempre fallaban)
- ✅ `isAdmin` e `isBotAdmin` ahora se calculan en tiempo real para cada usuario
- ✅ Eliminado `import()` dinámico dentro del loop de plugins (mejora de arranque)
- ✅ Corregido memory leak en sistema de cola (`setInterval` sin referencia)
- ✅ Eliminado setter ilegal de `mentionedJid` que causaba crash en protobuf
- ✅ `participantsUpdate` con optional chaining para evitar crash por idioma faltante

### ⚡ main.js
- ✅ `cachedGroupMetadata` corregido — ahora Baileys usa el caché real de grupos
- ✅ Listeners `groups.update` y `group-participants.update` según doc de Baileys
- ✅ Eliminado listener duplicado de `connection.update` que causaba doble ejecución
- ✅ Logs de consola limpiados — sin spam al iniciar ni al reconectar
- ✅ Limpieza automática de `src/libraries/tmp` cada 24 horas

### 🔐 pluginHelper.js
- ✅ `isAdmin` ya no se cachea por grupo — se calcula por sender en cada llamada
- ✅ Migración automática de JSON con formato viejo al arrancar
- ✅ Validación del JSON de admins — se auto-repara si está corrupto
- ✅ Fallback al caché en disco cuando WhatsApp devuelve `rate-overlimit`
- ✅ Deduplicación de queries a `groupMetadata` con mapa de promesas en vuelo

### 🔗 lid-resolver.js
- ✅ Resolución LID→JID en O(1) con caché en memoria
- ✅ Fallback a `groupCache` cuando el LID no está en caché aún
- ✅ Eliminado log de warning innecesario en consola

### 👥 groupMetadata.js
- ✅ Corregido bug crítico: `addAdminToCache` recibía número sin `@` — nunca coincidía
- ✅ Guarda campo `lid` en participants para resolución correcta

### 🎂 cumple.js
- ✅ Estado del checker persistido en disco — ya no falla si el bot se reinicia
- ✅ Ventana de envío ampliada a todo el día desde las 8 AM

### 📈 Resultados
- ✅ Detección de admin 100% correcta en grupos grandes con LID
- ✅ Cero `rate-overlimit` por queries duplicadas a WhatsApp
- ✅ Menor consumo de RAM — una sola fuente de verdad para metadata de grupos
- ✅ Baileys aprovechado al máximo según su documentación oficial

</td>
</tr>
</table>

---

## 🚀 Estado del Servicio

<img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=600&size=28&pause=1000&color=10B981&center=true&vCenter=true&repeat=true&width=435&lines=🟢+LUNA+BOT+ONLINE;✅+100%25+OPERATIVO;⚡+RESPUESTA+RÁPIDA" alt="Status" />

<br>

<p>
  <img src="https://img.shields.io/badge/📞%20Oficial-%2B54%209%20348%20351%201079-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="Teléfono"/>
  <img src="https://img.shields.io/badge/🔥%20Uptime-99.8%25-10B981?style=for-the-badge&logo=statuspage&logoColor=white" alt="Uptime"/>
  <img src="https://img.shields.io/badge/⏰%20Horario-24%2F7-8B5CF6?style=for-the-badge&logo=clock&logoColor=white" alt="24/7"/>
</p>

<br>

```yaml
🟢 Estado: Completamente Operativo
📱 Número Oficial: +54 9 348 351 1079
⏰ Disponibilidad: 24/7 Sin Interrupciones
🌐 Región: Argentina
💬 Respuestas: Instantáneas
```

<br>

<a href="https://wa.me/5493483511079">
  <img src="https://img.shields.io/badge/💬%20CONTACTAR%20BOT%20OFICIAL-25D366?style=for-the-badge&logo=whatsapp&logoColor=white&labelColor=128C7E" alt="Contactar"/>
</a>

<br><br>

> [!IMPORTANT]
> **📢 Aviso:** El bot está funcionando con normalidad. Para soporte técnico, contacta al número oficial.

> [!NOTE]
> **✨ Tip:** Guarda el número oficial en tus contactos para acceso rápido al bot.

<br>

<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">

<sub>Hecho con 💜🌙 por el equipo de Luna Bot</sub>

</div>

---

## 📋 Tabla de Contenidos

- [🌟 Características](#-características)
- [📦 Instalación](#-instalación)
- [⚙️ Configuración](#️-configuración)
- [🚀 Uso](#-uso)
- [📁 Estructura del Proyecto](#-estructura-del-proyecto)
- [🔧 Requisitos del Sistema](#-requisitos-del-sistema)
- [☁️ Despliegue en BoxMine](#️-despliegue-en-boxmine)
- [🤝 Contribuir](#-contribuir)
- [📞 Soporte](#-soporte)
- [👨‍💻 Creador](#-creador)
- [📄 Licencia](#-licencia)

---

<div align="center">

<img src="https://readme-typing-svg.herokuapp.com?font=Orbitron&weight=900&size=32&pause=1000&color=4DA6FF&center=true&vCenter=true&width=700&lines=🤖+LUNA+IA+—+Inteligencia+Artificial;🌙+Hablale+Natural+·+Sin+Comandos;✨+Ella+Te+Entiende+Siempre" alt="Luna IA" />

<br>

![IA Core](https://img.shields.io/badge/🧠-MOTOR_NLP_PROPIO-4DA6FF?style=for-the-badge&logo=openai&logoColor=white&labelColor=0d1b3e)
![No Prefix](https://img.shields.io/badge/💬-SIN_PREFIJOS-7BC8FF?style=for-the-badge&logo=whatsapp&logoColor=white&labelColor=0a2240)
![Always On](https://img.shields.io/badge/⚡-SIEMPRE_ACTIVA-50DC78?style=for-the-badge&logo=statuspage&logoColor=white&labelColor=0a3320)
![LID Safe](https://img.shields.io/badge/🛡️-LID_COMPATIBLE-FF6B9D?style=for-the-badge&logo=shield&logoColor=white&labelColor=3d0a20)

<br>

> *Luna tiene una IA conversacional integrada directamente en el grupo.*
> *No necesitás recordar comandos — solo mencionala y hablale natural.*

<br>

```js
const LunaIA = {
  activacion:  "@Luna + lo que necesites",
  entiende:    "frases naturales en español",
  responde:    "en tiempo real dentro del grupo",
  compatible:  "LID · @s.whatsapp.net · números normales",
  juegos:      ["Veo Veo 👁️", "Ahorcado 🎮"],
  moderacion:  ["Mute 🔇", "Kick 👢", "Ban 🚫"],
  config:      "activa/desactiva funciones hablando",
  extras:      ["Clima 🌤️", "Imágenes IA 🖼️", "Matemáticas 🧮", "Música 🎵"],
};
```

</div>

---

## 🤖 Luna IA — Documentación Completa

<div align="center">

### ⚡ ¿Cómo activarla?

</div>

Mencioná a Luna en el grupo usando su `@tag` seguido de lo que necesitás. Así de simple.

```
@Luna [lo que quieras]
```

> **No hay prefijos como `.` o `/` — es una conversación real.**

---

<div align="center">

### 👁️ Veo Veo

![VeoVeo](https://img.shields.io/badge/👁️-VEO_VEO-008B8B?style=for-the-badge&logo=eye&logoColor=white&labelColor=003d3d)
![Recompensas](https://img.shields.io/badge/🏆-RECOMPENSAS_XP-FFD700?style=for-the-badge&logo=star&logoColor=black&labelColor=5a3e00)

</div>

Luna elige un objeto secreto y vos tenés **3 minutos** para adivinarlo. Ganás XP y 💎 según la categoría.

| Frase | Acción |
|-------|--------|
| `@Luna veo veo` | Inicia el juego |
| `@Luna juguemos al veo veo` | Inicia el juego |
| `@Luna dame una pista` | Pide una pista |
| `@Luna cancela el juego` | Cancela la partida |
| `@Luna es una taza` | Intento de respuesta |

| Categoría | XP | 💎 |
|-----------|----|----|
| Cocina / Baño / Habitación | 300–600 | 50 |
| Animales / Frutas / Ropa | 400–800 | 75 |
| Objetos / Transporte | 600–1500 | 125 |
| 🔴 Difícil | 1500–3000 | 300 |

---

<div align="center">

### 🎮 Ahorcado

![Ahorcado](https://img.shields.io/badge/🎮-AHORCADO-FF4500?style=for-the-badge&logo=gamepad&logoColor=white&labelColor=5a1a00)
![Dificultad](https://img.shields.io/badge/⚙️-3_DIFICULTADES-8B5CF6?style=for-the-badge&logo=settings&logoColor=white&labelColor=3b1d8a)

</div>

| Frase | Acción |
|-------|--------|
| `@Luna ahorcado facil` | Inicia fácil |
| `@Luna ahorcado medio` | Inicia medio |
| `@Luna ahorcado dificil` | Inicia difícil |
| `@Luna dame una pista` | Pide pista |
| `@Luna cancela el ahorcado` | Cancela la partida |

| Dificultad | XP | 💎 |
|------------|----|----|
| 🟢 Fácil | 400 | 50 |
| 🟡 Medio | 800 | 100 |
| 🔴 Difícil | 2000 | 250 |

---

<div align="center">

### 🔇 Moderación desde la IA

</div>

| Frase | Efecto |
|-------|--------|
| `@Luna mutea a @usuario 30 min` | Silencio por 30 minutos |
| `@Luna desmutea a @usuario` | Quita el silencio |
| `@Luna expulsa a @usuario` | Expulsa del grupo |
| `@Luna banea a @usuario` | Banea al usuario del bot |
| `@Luna desbanea a @usuario` | Desbanea al usuario |
| `@Luna banea este chat` | El bot deja de responder en el grupo |

> [!TIP]
> **✨ Tip:** Podés ver el menú completo de la IA en cualquier momento con el comando `.iamenu`

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

## 🎮 Juegos disponibles en **Luna-BotV6**

| Juego | Descripción |
|-------|-------------|
| ![TicTacToe](https://img.shields.io/badge/❌⭕-TicTacToe-8A2BE2?style=for-the-badge) | Clásico 3 en línea |
| ![Ahorcado](https://img.shields.io/badge/🔤-Ahorcado-FF4500?style=for-the-badge) | Adivina la palabra |
| ![Buscaminas](https://img.shields.io/badge/💣-Buscaminas-DC143C?style=for-the-badge) | Descubre casillas sin pisar minas |
| ![Carreras](https://img.shields.io/badge/🏎️-Carreras-2F4F4F?style=for-the-badge) | Compite en carreras de velocidad |
| ![Apuestas](https://img.shields.io/badge/🎲-Apuestas-FFD700?style=for-the-badge) | Pon a prueba tu suerte |
| ![Ruleta](https://img.shields.io/badge/🎡-Ruleta-32CD32?style=for-the-badge) | Gira la ruleta y gana premios |
| ![Lotería](https://img.shields.io/badge/🎟️-Lotería-1E90FF?style=for-the-badge) | Participa y prueba tu suerte |
| ![PPT](https://img.shields.io/badge/✊🖐️✌️-PPT-FF69B4?style=for-the-badge) | Piedra, Papel o Tijera |
| ![BatallaNaval](https://img.shields.io/badge/🚢-Batalla_Naval-000080?style=for-the-badge) | Hundí la flota enemiga |
| ![Slot](https://img.shields.io/badge/🎰-Slot-A52A2A?style=for-the-badge) | Tragamonedas con premios |

---

## 📦 Instalación

### 📱 **Android (Termux)**

> [!TIP]
> Todos los comandos de abajo tienen botón de copiar — tocá el ícono 📋 en la esquina del bloque.

**Paso 1 — Instala Termux desde F-Droid** (versión recomendada, no Play Store):
```
https://f-droid.org/packages/com.termux/
```

**Paso 2 — Actualiza los paquetes:**
```bash
pkg update && pkg upgrade -y
```

**Paso 3 — Instala Node.js, Git y herramientas necesarias:**
```bash
pkg install nodejs git python make clang pkg-config -y
```

**Paso 4 — Clona el repositorio:**
```bash
git clone https://github.com/Luna-botv6/Luna-Botv6-Project.git
```

**Paso 5 — Entra a la carpeta:**
```bash
cd Luna-Botv6-Project
```

**Paso 6 — Instala dependencias:**
```bash
npm install
```

**Paso 7 — Instala herramientas multimedia:**
```bash
pkg install libvips ffmpeg imagemagick -y
```

**Paso 8 — Instala dependencias extra:**
```bash
npm install fs-extra && npm install wa-sticker-formatter --force --legacy-peer-deps
```

**Paso 9 — Edita tu config:**
```bash
nano config.js
```

Reemplazá con tus datos reales:
```js
global.owner = ['5491122334455']
global.mods  = ['5491122334455']
global.lid   = ['12345678901234@']
```

> Para obtener tu LID: enviá `/miid` al bot. Si responde con `@s.whatsapp.net`, creá un grupo temporal, añadí el bot, y usá `/miid` hasta que devuelva un ID con `@lid`.

Para guardar en nano: `Volumen Abajo + O` → Enter → `Volumen Abajo + X`

**Paso 10 — Inicia el bot:**
```bash
npm start
```

---

### 🐧 **Linux (Recomendado)**

```bash
git clone https://github.com/Luna-botv6/Luna-Botv6-Project.git
cd Luna-Botv6-Project
sudo apt update && sudo apt install nodejs npm python3 ffmpeg imagemagick -y
npm install
cp config.example.js config.js
nano config.js
npm start
```

---

### 🍎 **macOS**

```bash
git clone https://github.com/Luna-botv6/Luna-Botv6-Project.git
cd Luna-Botv6-Project
brew install node python3 ffmpeg imagemagick
npm install
cp config.example.js config.js
nano config.js
npm start
```

---

### 🪟 **Windows**

```powershell
git clone https://github.com/Luna-botv6/Luna-Botv6-Project.git
cd Luna-Botv6-Project
choco install nodejs python3 ffmpeg imagemagick
npm install
copy config.example.js config.js
notepad config.js
npm start
```

---

## ⚙️ Configuración

### 📝 **Configuración Básica**

Edita el archivo `config.js` con tus datos:

```javascript
global.owner = [
  ['5493483466763', 'Germán Miño', true],
]
global.lidOwners = [
  "128213666649",
];

global.mods  = ['5493483466763']
global.prems = ['5493483466763']

global.packname = 'Luna Bot'
global.author   = 'Germán Miño'
global.wm       = 'Luna Bot V6 - Created by Germán Miño'
```

> [!WARNING]
> Asegurate de agregar tu número en `global.owner` para evitar ser bloqueado por el antispam.

---

## 🚀 Uso

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

1. Ejecuta `npm start`
2. Escanea el código QR con WhatsApp Web, o ingresá tu número para recibir código de 8 dígitos
3. ¡El bot estará listo!

---

## 📁 Estructura del Proyecto

```
Luna-Botv6-Project/
├── 📁 database/          # Base de datos JSON
├── 📁 lib/               # Librerías principales
│   ├── funcion/
│   │   ├── pluginHelper.js    # Caché de admins + LID
│   │   ├── groupMetadata.js   # Metadata de grupos
│   │   └── lid-resolver.js    # Resolución LID→JID
├── 📁 plugins/           # Comandos del bot
│   ├── game-*.js         # Juegos
│   ├── tools-*.js        # Herramientas
│   ├── gc-*.js           # Comandos de grupo
│   └── ...
├── 📁 MysticSession/     # Sesión de WhatsApp
├── 📁 src/
│   └── libraries/        # Librerías base
├── 📄 main.js            # Archivo principal
├── 📄 handler.js         # Handler de mensajes
└── 📄 config.js          # Configuración
```

---

## 🔧 Requisitos del Sistema

| Componente | Versión | Descripción |
|------------|---------|-------------|
| **Node.js** | v18+ | Motor de JavaScript |
| **NPM** | v8+ | Gestor de paquetes |
| **Python** | v3.8+ | Para módulos específicos |
| **FFmpeg** | Latest | Procesamiento multimedia |
| **ImageMagick** | Latest | Manipulación de imágenes |
| **RAM** | 500MB mín. | 700MB+ recomendado |
| **Almacenamiento** | 1.5GB | Espacio libre |

---

## ☁️ Despliegue en BoxMine

<div align="center">

<a href="https://boxmineworld.com">
  <img src="https://dash.boxmineworld.com/storage/icon.png" width="60" style="border-radius:10px;" alt="BoxMine"/>
</a>

### <a href="https://boxmineworld.com">BoxMineWorld</a> — Hosting recomendado para Luna-Bot v6

[![BoxMine](https://img.shields.io/badge/☁️%20Hosting-BoxMineWorld-7e3af2?style=for-the-badge&logoColor=white&labelColor=4a148c)](https://boxmineworld.com)
[![Panel](https://img.shields.io/badge/🖥️%20Panel-panel.boxmineworld.com-6c2bd9?style=for-the-badge&logoColor=white&labelColor=3d0a70)](https://panel.boxmineworld.com)

</div>

<details>
<summary><b>🔗 Enlaces importantes de BoxMine</b></summary>

- **Sitio Web:** [https://boxmineworld.com](https://boxmineworld.com)
- **Área de Clientes / Registro:** [https://dash.boxmineworld.com](https://dash.boxmineworld.com)
- **Panel de Control:** [https://panel.boxmineworld.com](https://panel.boxmineworld.com)
- **Documentación:** [https://docs.boxmineworld.com](https://docs.boxmineworld.com)
- **Comunidad Discord:** [¡Únete aquí!](https://discord.gg/84qsr4v)

</details>

---

### 📋 Guía paso a paso — BoxMine

> [!NOTE]
> En BoxMine **no se usa `npm start` ni comandos de terminal**. Todo se maneja desde la consola del panel web. Seguí estos pasos exactos.

---

**Paso 1 — Crear cuenta**

Ingresá a [dash.boxmineworld.com/register](https://dash.boxmineworld.com/register), completá usuario, correo, contraseña y la verificación. Confirmá tu correo.

---

**Paso 2 — Crear el servidor**

1. En el panel hacé clic en **Crear Servidor**
2. En la lista de ubicaciones elegí **Free-N6** (si hay lugar disponible, es el nodo free recomendado)
3. En **Productos** seleccioná **Free-Wa** — es el plan gratuito para bots de WhatsApp
4. En el selector de **Software** buscá y elegí **Luna-Botv6**
5. Poné un nombre al servidor (ej: `Botluna`) y hacé clic en **Crear Servidor**

> [!TIP]
> Si Free-N6 no tiene lugar disponible, probá con **Free-N4** o **Free**. El nodo N6 suele ser el más estable para bots.

---

**Paso 3 — Entrar al servidor y vincularlo**

1. En tu lista de servidores, hacé clic en **Gestionar** del servidor recién creado
2. Una vez dentro del panel del servidor, tocá las **tres líneas** (☰) arriba a la derecha
3. Seleccioná **Consola**
4. Escribí `start` en la consola y presioná Enter
5. Esperá que se descarguen todas las dependencias automáticamente

Una vez que termina la instalación verás en consola:

```
Iniciando Luna-Botv6...
Elegí un método para vincular:
1. Código QR
2. Código de 8 dígitos
```

6. Escribí `1` para QR o `2` para código de 8 dígitos
   - Si elegís **2**, escribí tu número **sin espacios ni +** (ej: `5493483511079`)
   - El bot te enviará un código de 8 dígitos a tu WhatsApp
   - Ingresalo en WhatsApp: **Configuración → Dispositivos vinculados → Vincular con número**

> [!IMPORTANT]
> En la consola de BoxMine **solo escribís números** para elegir opciones al vincular. No uses `npm start` ni otros comandos — el panel lo gestiona todo automáticamente.

---

## ⚡ Sistema de Actualización Inteligente

| Comando | Función | Riesgo |
|:-------:|---------|:------:|
| `/actualizacion` | Verifica updates disponibles | 🟢 Ninguno |
| `/gitpull` | Actualiza todo | 🟡 Medio |
| `/gitpull --force` | Fuerza actualización | 🔴 Alto |
| `/gitpull omite` | Actualiza protegiendo config | 🟢 Bajo |
| `/restaurar` | Restaura backup | 🟢 Bajo |
| `/eliminarbackup` | Elimina backups | 🟢 Ninguno |

---

## 🤝 Contribuir

1. 🍴 Fork el proyecto
2. 🌿 Crea una rama (`git checkout -b feature/NuevaFuncion`)
3. 📝 Commit tus cambios (`git commit -m 'Add NuevaFuncion'`)
4. 📤 Push a la rama (`git push origin feature/NuevaFuncion`)
5. 📄 Abre un Pull Request

---

## 📞 Soporte

[![WhatsApp Channel](https://img.shields.io/badge/WhatsApp-Canal%20Oficial-25D366?style=for-the-badge&logo=whatsapp)](https://whatsapp.com/channel/0029VbANyNuLo4hedEWlvJ3Y)

- 📝 [Crear Issue / Bug](https://github.com/Luna-botv6/Luna-Botv6-Project/issues/new?template=bug_report.md)
- 💡 [Solicitar Feature](https://github.com/Luna-botv6/Luna-Botv6-Project/issues/new?template=feature_request.md)

---

## 👨‍💻 Creador

<div align="center">

### 🌙 **Germán Miño**
*Creador y Desarrollador Principal de Luna Bot V6*

[![WhatsApp](https://img.shields.io/badge/WhatsApp-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://wa.me/5493483466763)
[![Discord](https://img.shields.io/badge/Discord-7289DA?style=for-the-badge&logo=discord&logoColor=white)](https://discord.com/users/german_coto)
[![Email](https://img.shields.io/badge/Email-D14836?style=for-the-badge&logo=gmail&logoColor=white)](mailto:lunabotv6@gmail.com)
[![Facebook](https://img.shields.io/badge/Facebook-1877F2?style=for-the-badge&logo=facebook&logoColor=white)](https://www.facebook.com/profile.php?id=61580601092491)

**📱 WhatsApp:** `+54 9 348 346 6763`
**💬 Discord:** `german_coto`
**📧 Email:** `lunabotv6@gmail.com`

</div>

---

## 🙏 Reconocimientos

Basado en el excelente trabajo de **[Mystic-Bot-MD](https://github.com/BrunoSobrino/TheMystic-Bot-MD)** por [Bruno Sobrino](https://github.com/BrunoSobrino).

---

## 📄 Licencia

Licenciado bajo la [Licencia MIT](LICENSE).

---

## ❤️ ¿Querés apoyar el proyecto?

<div align="center">

[![PayPal](https://img.shields.io/badge/PayPal-Donar-003087?style=for-the-badge&logo=paypal&logoColor=white)](mailto:gercoto17@gmail.com)
[![Mercado Pago](https://img.shields.io/badge/Mercado%20Pago-Donar-00A8E0?style=for-the-badge&logo=mercadopago&logoColor=white)](#)

**PayPal:** gercoto17@gmail.com | **Mercado Pago:** german.elias.23

**¡Gracias por tu apoyo! 🙌**

</div>

---

<div align="center">

**🌙 Hecho con ❤️ por Germán Miño para la comunidad de WhatsApp**

[![GitHub](https://img.shields.io/badge/GitHub-Luna--Bot-black?style=flat-square&logo=github)](https://github.com/Luna-botv6/Luna-Botv6-Project)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-Channel-25D366?style=flat-square&logo=whatsapp)](https://whatsapp.com/channel/0029VbANyNuLo4hedEWlvJ3Y)

</div>
