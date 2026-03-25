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
---

```

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
- ✅ `isAdmin` e `isBotAdmin` ahora se calculan en tiempo real para cada usuario en `extra`
- ✅ Eliminado `import()` dinámico dentro del loop de plugins (mejora arranque)
- ✅ Corregido memory leak en sistema de cola (`setInterval` sin referencia)
- ✅ Eliminado setter ilegal de `mentionedJid` que causaba crash en protobuf
- ✅ `participantsUpdate` con optional chaining para evitar crash por idioma faltante

### ⚡ main.js
- ✅ `cachedGroupMetadata` corregido — ahora Baileys usa el caché real de grupos
- ✅ Listeners `groups.update` y `group-participants.update` implementados según la doc de Baileys
- ✅ Eliminado listener duplicado de `connection.update` que causaba doble ejecución
- ✅ Logs de consola limpiados — sin spam al iniciar ni al reconectar
- ✅ Limpieza automática de `src/libraries/tmp` cada 24 horas
- ✅ Reconexión de subbots y log "Conectado" con flag para evitar duplicados

### 🔐 pluginHelper.js
- ✅ `isAdmin` ya no se cachea por grupo — se calcula por sender en cada llamada
- ✅ Migración automática de JSON con formato viejo (número sin `@`) al arrancar
- ✅ Validación del JSON de admins — se auto-repara si está corrupto
- ✅ Fallback al caché en disco cuando WhatsApp devuelve `rate-overlimit`
- ✅ Deduplicación de queries a `groupMetadata` con mapa de promesas en vuelo
- ✅ Escritura a disco cada 10s solo cuando hay cambios (dirty flag)

### 🔗 lid-resolver.js
- ✅ Resolución LID→JID en O(1) con caché en memoria
- ✅ Fallback a `groupCache` cuando el LID no está en caché aún
- ✅ Fallback final a `conn.contacts` como último recurso
- ✅ Eliminado log de warning innecesario en consola

### 👥 groupMetadata.js
- ✅ Corregido bug crítico: `addAdminToCache` recibía número sin `@` — nunca coincidía
- ✅ Guarda campo `lid` en participants para resolución correcta
- ✅ `isBotAdmin` con check explícito igual que `pluginHelper`
- ✅ Eliminado `requestDelay` redundante con el sistema de deduplicación

### 🎂 cumple.js
- ✅ Estado del checker persistido en disco (`cumple_checker.json`)
- ✅ Ventana de envío ampliada — ya no falla si el bot se reinicia después de las 8:00 AM
- ✅ El archivo de estado se crea automáticamente la primera vez

### 📈 Resultados
- ✅ Detección de admin 100% correcta en grupos grandes con LID
- ✅ Cero `rate-overlimit` por queries duplicadas a WhatsApp
- ✅ Menor consumo de RAM — una sola fuente de verdad para metadata de grupos
- ✅ Baileys aprovechado al máximo según su documentación oficial
- ✅ Auto-reparación del JSON de admins sin intervención manual

</td>
</tr>
</table>

---

## 🚀 Estado del Servicio

<img src="https://readme-typing-svg.herokuapp.com?font=Fira+Code&weight=600&size=28&pause=1000&color=10B981&center=true&vCenter=true&repeat=true&width=435&lines=🟢+LUNA+BOT+ONLINE;✅+100%25+OPERATIVO;⚡+RESPUESTA+RÁPIDA" alt="Status" />

<br>

<!-- Badges animados -->
<p>
  <img src="https://img.shields.io/badge/📅%01Fecha-02%20Feb%202026-5B21B6?style=for-the-badge&logo=calendar&logoColor=white" alt="Fecha"/>
  <img src="https://img.shields.io/badge/📞%20Oficial-%2B54%209%20348%20351%201079-25D366?style=for-the-badge&logo=whatsapp&logoColor=white" alt="Teléfono"/>
</p>

<p>
  <img src="https://img.shields.io/badge/⚡%20Latencia-42ms-FCD34D?style=for-the-badge&logo=lightning&logoColor=white" alt="Latencia"/>
  <img src="https://img.shields.io/badge/🔥%20Uptime-99.8%25-10B981?style=for-the-badge&logo=statuspage&logoColor=white" alt="Uptime"/>
  <img src="https://img.shields.io/badge/⏰%20Horario-24%2F7-8B5CF6?style=for-the-badge&logo=clock&logoColor=white" alt="24/7"/>
</p>

<br>

<!-- Cuadro de información -->
```yaml
🟢 Estado: Completamente Operativo
📱 Número Oficial: +54 9 348 351 1079
📅 Última Verificación: 17 Octubre, 2025
⏰ Disponibilidad: 24/7 Sin Interrupciones
🌐 Región: Argentina
💬 Respuestas: Instantáneas
```

<br>

<!-- Botón de contacto destacado -->
<a href="https://wa.me/5493483511079">
  <img src="https://img.shields.io/badge/💬%20CONTACTAR%20BOT%20OFICIAL-25D366?style=for-the-badge&logo=whatsapp&logoColor=white&labelColor=128C7E" alt="Contactar"/>
</a>

<br><br>

<!-- Estadísticas visuales -->
<table>
<tr>
<td align="center" width="150">
  <img src="https://img.shields.io/badge/🎯-ACTIVO-10B981?style=flat-square&labelColor=065F46" width="100%"/>
  <br><b>Estado</b>
</td>
<td align="center" width="150">
  <img src="https://img.shields.io/badge/⚡-42ms-FCD34D?style=flat-square&labelColor=92400E" width="100%"/>
  <br><b>Latencia</b>
</td>
<td align="center" width="150">
  <img src="https://img.shields.io/badge/📊-99.8%25-8B5CF6?style=flat-square&labelColor=5B21B6" width="100%"/>
  <br><b>Uptime</b>
</td>
<td align="center" width="150">
  <img src="https://img.shields.io/badge/🌟-24%2F7-EC4899?style=flat-square&labelColor=9F1239" width="100%"/>
  <br><b>Soporte</b>
</td>
</tr>
</table>

---

<!-- Aviso importante con estilo -->
> [!IMPORTANT]
> **📢 Aviso:** El bot está funcionando con normalidad. Para soporte técnico, contacta al número oficial.

<!-- Alternativa con nota -->
> [!NOTE]
> **✨ Tip:** Guarda el número oficial en tus contactos para acceso rápido al bot.

<br>

<!-- Separador animado -->
<img src="https://user-images.githubusercontent.com/73097560/115834477-dbab4500-a447-11eb-908a-139a6edaec5c.gif">

<!-- Firma o créditos -->
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
- [🌐 Despliegue](#-despliegue)
- [🤝 Contribuir](#-contribuir)
- [📞 Soporte](#-soporte)
- [👨‍💻 Creador](#-creador)
- [📄 Licencia](#-licencia)

---


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

```
🌙  Me viene una imagen...
📂  Categoría: COCINA
🗨️  lo usás todos los días para tomar café
⏰  3 minutos · pedí pista cuando quieras
```

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

El clásico de siempre. Adiviná la palabra letra por letra antes de completar el dibujo. **Pista automática en el último intento.**

| Frase | Acción |
|-------|--------|
| `@Luna ahorcado facil` | Inicia fácil |
| `@Luna ahorcado medio` | Inicia medio |
| `@Luna ahorcado dificil` | Inicia difícil |
| `@Luna dame una pista` | Pide pista manualmente |
| `@Luna cancela el ahorcado` | Cancela la partida |
| `a` *(una sola letra)* | Propone esa letra |

```
   +---+
   |   |
   O   |
  /|\  |
       |
  =========

_ _ _ _ _ _ _ _   (8 letras)
Intentos: 4/6  ·  ⏰ 3 minutos
```

| Dificultad | XP | 💎 |
|------------|----|----|
| 🟢 Fácil | 400 | 50 |
| 🟡 Medio | 800 | 100 |
| 🔴 Difícil | 2000 | 250 |

---

<div align="center">

### 🔇 Moderación desde la IA

![Mute](https://img.shields.io/badge/🔇-MUTE_SYSTEM-4DA6FF?style=for-the-badge&logo=microphone-slash&logoColor=white&labelColor=0d1b3e)
![Kick](https://img.shields.io/badge/👢-EXPULSAR-FF6B9D?style=for-the-badge&logo=user-minus&logoColor=white&labelColor=3d0a20)
![Ban](https://img.shields.io/badge/🚫-BAN_SYSTEM-EC4899?style=for-the-badge&logo=forbidden&logoColor=white&labelColor=5a0020)

</div>

Moderá el grupo sin salir de la conversación. Solo el **owner y admins** pueden usar estos comandos.

#### 🔇 Silenciar usuarios

| Frase | Efecto |
|-------|--------|
| `@Luna mutea a @usuario` | Silencio permanente |
| `@Luna mutea a @usuario 30 min` | Silencio por 30 minutos |
| `@Luna mutea a @usuario 2 horas` | Silencio por 2 horas |
| `@Luna silencia a @usuario` | Silencio permanente |
| `@Luna desmutea a @usuario` | Quita el silencio |
| `@Luna ya puede hablar @usuario` | Quita el silencio |

#### 👢 Expulsar usuarios

| Frase | Efecto |
|-------|--------|
| `@Luna expulsa a @usuario` | Expulsa del grupo |
| `@Luna echa a @usuario` | Expulsa del grupo |
| `@Luna saca a @usuario` | Expulsa del grupo |
| `@Luna kickea a @usuario` | Expulsa del grupo |

> ⚠️ El bot necesita ser **admin** del grupo para expulsar. El owner tiene inmunidad total.

#### 🚫 Banear usuarios y chats

| Frase | Efecto |
|-------|--------|
| `@Luna banea a @usuario` | Banea al usuario del bot |
| `@Luna desbanea a @usuario` | Desbanea al usuario |
| `@Luna banea este chat` | El bot deja de responder en el grupo |
| `@Luna desbanea este chat` | El bot vuelve a responder |

> 🔐 Solo el **owner** puede banear chats y usuarios.

---

<div align="center">

### ⚙️ Configurar el grupo con palabras

![Config](https://img.shields.io/badge/⚙️-CONFIG_NATURAL-50DC78?style=for-the-badge&logo=settings&logoColor=white&labelColor=0a3320)

</div>

Activá y desactivá funciones del grupo hablándole a Luna. Sin recordar comandos técnicos.

| Frase | Función |
|-------|---------|
| `@Luna activa el modoadmin` | Solo admins usan el bot |
| `@Luna activa el antilink` | Bloquea enlaces |
| `@Luna activa la bienvenida` | Mensaje de bienvenida |
| `@Luna activa el antidelete` | Guarda mensajes eliminados |
| `@Luna activa el antitoxic` | Filtra palabras ofensivas |
| `@Luna activa el autosticker` | Sticker automático |
| `@Luna activa el antispam` | Bloquea spam |
| `@Luna activa el restrict` | Modo restringido (owner) |
| `@Luna desactiva el [función]` | Desactiva cualquier función |
| `@Luna activa` *(sin especificar)* | Muestra el menú completo |

#### Abrir / Cerrar el grupo

| Frase | Efecto |
|-------|--------|
| `@Luna abre el grupo` | Todos pueden escribir |
| `@Luna cierra el grupo` | Solo admins pueden escribir |

#### Invocar a todos

| Frase | Efecto |
|-------|--------|
| `@Luna invoca a todos` | Menciona a todos los participantes |
| `@Luna mencionar todos` | Menciona a todos los participantes |

---

<div align="center">

### 🎵 Descargas desde la IA

![Music](https://img.shields.io/badge/🎵-DESCARGAS-FF6B9D?style=for-the-badge&logo=spotify&logoColor=white&labelColor=3d0a20)

</div>

| Frase | Efecto |
|-------|--------|
| `@Luna descarga la música de Tini` | Descarga audio de YouTube |
| `@Luna bajame la canción de Bizarrap` | Descarga audio |
| `@Luna playlist Shakira` | Lista de canciones del artista |
| `[link de TikTok]` | Descarga automática |
| `[link de Facebook]` | Descarga automática |
| `[link de Instagram]` | Descarga automática |

---

<div align="center">

### 🖼️ Generar imágenes con IA

![Images](https://img.shields.io/badge/🖼️-IMÁGENES_IA-8B5CF6?style=for-the-badge&logo=image&logoColor=white&labelColor=3b1d8a)

</div>

| Frase | Efecto |
|-------|--------|
| `@Luna genera una imagen de un dragón` | Genera imagen con IA |
| `@Luna crea una foto de ciudad futurista` | Genera imagen con IA |
| `@Luna genera un dibujo de montaña` | Genera imagen con IA |
| `@Luna crea un arte de espacio` | Genera imagen con IA |

---

<div align="center">

### 🧮 Matemáticas

![Math](https://img.shields.io/badge/🧮-MATEMÁTICAS-FCD34D?style=for-the-badge&logo=calculator&logoColor=black&labelColor=5a3e00)

</div>

| Frase | Tipo |
|-------|------|
| `@Luna cuánto es 2 + 2` | Operación básica |
| `@Luna calcula 150 * 3` | Operación básica |
| `@Luna la mitad de 5000` | División rápida |
| `@Luna 20% de 800` | Porcentaje |
| `@Luna derivada de x^3` | Cálculo |
| `@Luna promedio de 4, 7, 9` | Estadística |
| `@Luna 2x + 7 = 11` | Ecuación |

---

<div align="center">

### 🌤️ Clima

![Weather](https://img.shields.io/badge/🌤️-CLIMA_GLOBAL-10B981?style=for-the-badge&logo=cloud&logoColor=white&labelColor=065F46)

</div>

| Frase | Efecto |
|-------|--------|
| `@Luna clima de Buenos Aires` | Clima actual + pronóstico |
| `@Luna tiempo en Madrid` | Clima actual + pronóstico |
| `@Luna temperatura en Bogotá` | Temperatura actual |
| `@Luna va a llover en Lima` | Probabilidad de lluvia |

---

<div align="center">

### 💬 Soporte e información

![Support](https://img.shields.io/badge/💬-SOPORTE-4DA6FF?style=for-the-badge&logo=help&logoColor=white&labelColor=0d1b3e)

</div>

| Frase | Respuesta |
|-------|-----------|
| `@Luna cómo instalo en Termux` | Guía de instalación Android |
| `@Luna cómo instalo en Boxmine` | Guía de instalación Boxmine |
| `@Luna cómo instalo en Windows` | Guía de instalación Windows |
| `@Luna contacto oficial` | Datos de contacto del creador |
| `@Luna quién te hizo` | Info del creador |
| `@Luna qué podés hacer` | Lista de funciones |

---

<div align="center">

### 🗣️ Charla libre

Luna tiene un motor NLP propio con stemming y bigramas. Entiende emociones, contexto y humor.

| Lo que decís | Lo que entiende |
|-------------|-----------------|
| `@Luna cómo estás` | Saludo / estado |
| `@Luna estoy triste` | Contención emocional |
| `@Luna contame un chiste` | Humor |
| `@Luna dame un consejo` | Consejos |
| `@Luna dile a @usuario que...` | Recados |
| `@Luna messi o ronaldo` | Respuesta 100% argentina 🇦🇷 |

<br>

> [!TIP]
> **✨ Tip:** Podés ver el menú completo de la IA en cualquier momento con el comando `.iamenu`

<br>

![Footer IA](https://capsule-render.vercel.app/api?type=waving&color=4DA6FF,7BC8FF,50DC78&height=80&section=footer)

</div>

---

## 🌟 Características

## 🚀💫 **¡NOVEDAD EMOCIONANTE!** ✨🎉

<div align="center">

### 🛠️⚡ **Crea Tus Propios Comandos Personalizados** ⚡🛠️

![Custom Commands](https://img.shields.io/badge/🤖-COMANDOS_PERSONALIZADOS-FF6B6B?style=for-the-badge&logo=robot&logoColor=white&labelColor=FF4757)
![Owner Only](https://img.shields.io/badge/👑-SOLO_OWNERS-FFD700?style=for-the-badge&logo=crown&logoColor=black&labelColor=FFA502)
![Easy Creation](https://img.shields.io/badge/⚡-CREACIÓN_FÁCIL-4ECDC4?style=for-the-badge&logo=magic&logoColor=white&labelColor=00CEC9)

**🎯 ¡Ahora puedes crear tus propios comandos sin escribir código!** 
*El bot te guiará paso a paso para que personalices tu experiencia al máximo* 🌟

</div>

---

### 🎨 **¿Qué Puedes Crear?**

| 📝 **Mensajes Personalizados** | 🏷️ **Etiquetas Inteligentes** | 🖼️ **Comandos con Imágenes** |
|:------------------------------:|:-----------------------------:|:----------------------------:|
| Crea respuestas únicas con tu toque personal | Decide quién será mencionado automáticamente | Agrega contenido visual a tus comandos |

---

### 📋 **Guía Paso a Paso**

| Paso | Comando | Descripción | Ejemplo |
|:----:|---------|-------------|---------|
| **1️⃣** | `🚀 /createcode` | Inicia el creador de comandos | `/createcode` |
| **2️⃣** | `📝 /setmessage` | Define el mensaje de respuesta | `/setmessage ¡Hola mundo!` |
| **3️⃣** | `🏷️ /settag` | Configura las menciones | `/settag si` `/settag no` `/settag todos` |
| **4️⃣** | `🖼️ /setimage` | Añade soporte para imágenes | `/setimage si` `/setimage no` |
| **5️⃣** | `⚡ /setcommand` | Establece el nombre del comando | `/setcommand micomando` |

---

### 🎯 **Características Destacadas**

<div align="center">

| 🤖 **Guiado Inteligente** | 👑 **Exclusivo para Owners** | ⚡ **Sin Código** |
|:------------------------:|:-----------------------------:|:------------------:|
| ![Bot Guide](https://img.shields.io/badge/🤖-GUÍA_AUTOMÁTICA-00D2D3?style=flat-square) | ![Crown](https://img.shields.io/badge/👑-PRIVILEGIOS_VIP-FFD700?style=flat-square) | ![No Code](https://img.shields.io/badge/⚡-ZERO_CODING-FF6B6B?style=flat-square) |
| El bot te dice exactamente qué hacer | Solo los propietarios pueden crear comandos | No necesitas saber programar |

| 🎨 **Personalización Total** | 📱 **Fácil de Usar** | 🔧 **Configuración Flexible** |
|:---------------------------:|:---------------------:|:-----------------------------:|
| ![Customize](https://img.shields.io/badge/🎨-100%25_PERSONALIZABLE-A55EEA?style=flat-square) | ![Easy](https://img.shields.io/badge/📱-INTERFAZ_AMIGABLE-26DE81?style=flat-square) | ![Flexible](https://img.shields.io/badge/🔧-SÚPER_FLEXIBLE-FF9F43?style=flat-square) |
| Comandos únicos que reflejen tu personalidad | Interfaz intuitiva y comandos simples | Opciones avanzadas disponibles |

</div>

---

<div align="center">

### 🌟 **¡Desata tu Creatividad!** 🌟

**Con esta función, el límite es tu imaginación. Crea comandos únicos, divertidos y completamente personalizados que hagan de tu bot algo especial** ✨

*¿Qué esperás? ¡Empezá a crear tus propios comandos ahora mismo!* 🚀

</div>

---

## ⚡🔄 **Sistema de Actualización Inteligente** 🔄⚡

<div align="center">

![Auto Update](https://img.shields.io/badge/🔄-ACTUALIZACIÓN_AUTOMÁTICA-00D4AA?style=for-the-badge&logo=refresh&logoColor=white&labelColor=00A085)
![Git Integration](https://img.shields.io/badge/📦-INTEGRACIÓN_GIT-F05032?style=for-the-badge&logo=git&logoColor=white&labelColor=E94E32)
![Owner Control](https://img.shields.io/badge/👑-CONTROL_TOTAL-FFD700?style=for-the-badge&logo=settings&logoColor=black&labelColor=FFA502)

**🎯 Mantén tu bot siempre actualizado con la última versión del repositorio**
*Sistema inteligente que detecta, compara y aplica actualizaciones automáticamente* 🚀

</div>

---

# 📋 Sistema Completo de Actualización y Gestión

## 🔍 Detección Automática de Actualizaciones
| Verificación | Comparación | Aplicación |
|:------------:|:-----------:|:----------:|
| ![Check](https://img.shields.io/badge/🔍-VERIFICACIÓN_AUTOMÁTICA-4A90E2?style=flat-square) | ![Compare](https://img.shields.io/badge/📊-COMPARACIÓN_INTELIGENTE-F39C12?style=flat-square) | ![Apply](https://img.shields.io/badge/🔄-APLICACIÓN_SEGURA-27AE60?style=flat-square) |
| Revisa el repositorio en tiempo real | Compara archivos locales vs remotos | Actualiza solo lo necesario |

---

## 📋 Comandos de Actualización

### 🔹 Básicos
| Comando | Función | Descripción | Uso |
|:-------:|---------|-------------|-----|
| 🔍 `/actualizacion` | **Verificar Updates** | Busca nuevas actualizaciones disponibles | `/actualizacion` |
| 📥 `/gitpull` | **Actualizar Normal** | Descarga e instala actualizaciones | `/gitpull` |
| ⚡ `/gitpull --force` | **Actualización Forzada** | Actualiza eliminando cambios locales | `/gitpull --force` |

### 🔹 Avanzados
| Comando | Función | Descripción | Uso |
|:-------:|---------|-------------|-----|
| 🛡️ `/gitpull omite` | **Actualización Protegida** | Omite archivos sensibles en la actualización | `/gitpull omite` |
| 🔄 `/restaurar` | **Restaurar Backup** | Vuelve tu config.js y funciones a la normalidad | `/restaurar` |
| 🗑️ `/eliminarbackup` | **Eliminar Backup** | Borra respaldos innecesarios | `/eliminarbackup` |

---

## 🎯 Flujo de Trabajo Recomendado
```mermaid
flowchart TD
    A[/actualizacion/] --> B{¿Hay updates?}
    B -- No --> Z[Sistema actualizado ✓]
    B -- Sí --> C[/gitpull/]
    C --> D{¿Proteger archivos?}
    D -- No --> E[/gitpull normal/]
    D -- Sí --> F[/gitpull omite/]
    F --> G[Backup creado 🛡️]
    G --> H{¿Problema?}
    H -- No --> I[/eliminarbackup/]
    H -- Sí --> J[/restaurar/]
```

---

## 💡 Casos de Uso

### 🔹 Escenario 1: Actualización Estándar
```bash
/actualizacion
/gitpull
```

### 🔹 Escenario 2: Proteger Configuraciones Personales
```bash
/actualizacion
/gitpull omite
```
👉 Mantiene seguros: `config.js`, `.env`, `database.json`

### 🔹 Escenario 3: Recuperación de Emergencia
```bash
/gitpull omite
/restaurar
```

### 🔹 Escenario 4: Limpieza de Backups
```bash
/eliminarbackup
```

---

## 🔐 Archivos Comúnmente Protegidos
- 📝 `config.js`, `custom-commands` → Configuración personalizada  
- 🔑 `.Mysticseccion`, `credentials.json` → Tokens y claves   
- 💾 `database.json`, `database` → Información de usuarios  
- 👥 `moderacion`, `configuracion.json` → Moderación de grupos


---

## ⚠️ Advertencias y Buenas Prácticas
- ⚡ **`/gitpull --force`**: borra cambios locales → usar solo en emergencias.  
- 🛡️ **`/gitpull omite`**: recomendado para proteger tus plugins.  
- 🔄 **`/restaurar`**: recupera los archivos protegidos.  
- 🗑️ **`/eliminarbackup`**: libera espacio cuando confirmes que todo funciona bien.  

---

## 📊 Resumen de Comandos
| Comando | Acción | Backup | Modifica Archivos | Riesgo |
|:-------:|--------|:------:|:-----------------:|:------:|
| `/actualizacion` | Verifica updates | ❌ | ❌ | 🟢 Ninguno |
| `/gitpull` | Actualiza todo | ❌ | ✅ | 🟡 Medio |
| `/gitpull --force` | Fuerza actualización | ❌ | ✅ | 🔴 Alto |
| `/gitpull omite` | Actualiza protegiendo | ✅ | ✅ | 🟢 Bajo |
| `/restaurar` | Restaura backup | ❌ | ✅ | 🟢 Bajo |
| `/eliminarbackup` | Elimina backups | ❌ | ❌ | 🟢 Ninguno |

---

## 📝 Guía Rápida
- **Primera vez:** `/actualizacion` → `/gitpull omite`  
- **Mantenimiento:** `/actualizacion` → `/gitpull omite`  
- **recupera tu configuracion:** `/restaurar`  
- **Todo OK:** `/eliminarbackup`  
- **Emergencia:** `/gitpull --force`  

---


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

</div>

---

## 🎮 Juegos disponibles en **Luna-BotV6**

✨ Una colección de minijuegos al estilo *retro gamer* para divertirte en tus grupos:

| Juego | Descripción |
|-------|-------------|
| ![TicTacToe](https://img.shields.io/badge/❌⭕-TicTacToe-8A2BE2?style=for-the-badge&logo=gamepad&logoColor=white) | Clásico 3 en línea contra el bot o amigos |
| ![Ahorcado](https://img.shields.io/badge/🔤-Ahorcado-FF4500?style=for-the-badge&logo=joystick&logoColor=white) | Adivina la palabra antes de quedarte sin intentos |
| ![Buscaminas](https://img.shields.io/badge/💣-Buscaminas-DC143C?style=for-the-badge&logo=skull&logoColor=white) | Descubre casillas sin pisar minas 💥 |
| ![RPG](https://img.shields.io/badge/⚔️-RPG-006400?style=for-the-badge&logo=sword&logoColor=white) | Minar recursos, robar y usar prote anti-robo |
| ![Carreras](https://img.shields.io/badge/🏎️-Carreras-2F4F4F?style=for-the-badge&logo=fastlane&logoColor=white) | Compite en emocionantes carreras de velocidad 🏁 |
| ![Apuestas](https://img.shields.io/badge/🎲-Apuestas-FFD700?style=for-the-badge&logo=casino&logoColor=black) | Pon a prueba tu suerte apostando 💵 |
| ![Ruleta](https://img.shields.io/badge/🎡-Ruleta-32CD32?style=for-the-badge&logo=apachespark&logoColor=white) | Gira la ruleta y gana premios 🎯 |
| ![Lotería](https://img.shields.io/badge/🎟️-Lotería-1E90FF?style=for-the-badge&logo=ticketmaster&logoColor=white) | Participa y prueba tu suerte en la lotería 🎫 |
| ![Quini6](https://img.shields.io/badge/🎰-Quini6-800080?style=for-the-badge&logo=googleforms&logoColor=white) | Juega al famoso Quini 6 con tus números favoritos 🔢 |
| ![PPT](https://img.shields.io/badge/✊🖐️✌️-PPT-FF69B4?style=for-the-badge&logo=rocketchat&logoColor=white) | Piedra, Papel o Tijera clásico 🪨📄✂️ |
| ![BatallaNaval](https://img.shields.io/badge/🚢-Batalla_Naval-000080?style=for-the-badge&logo=ship&logoColor=white) | Hundí la flota enemiga antes que hundan la tuya ⚓ |
| ![Sopa](https://img.shields.io/badge/🔠-Sopa_de_letras-20B2AA?style=for-the-badge&logo=matrix&logoColor=white) | Encuentra las palabras escondidas en la sopa 🔍 |
| ![Retos](https://img.shields.io/badge/🎯-Retos-008000?style=for-the-badge&logo=target&logoColor=white) | Completa desafíos divertidos contra tus amigos 🎉 |
| ![VeoVeo](https://img.shields.io/badge/👀-Veo_Veo-008B8B?style=for-the-badge&logo=eyeem&logoColor=white) | El tradicional juego de observación 🔎 |
| ![Slot](https://img.shields.io/badge/🎰-Slot-A52A2A?style=for-the-badge&logo=atom&logoColor=white) | Tragamonedas con premios aleatorios 🎉 |
| ![Mas](https://img.shields.io/badge/💫-Y_mucho_más-000000?style=for-the-badge&logo=arcade&logoColor=white) | Siempre se agregan juegos nuevos 😉 |

---

## ⚙️✨ Configuración de Grupos en **Luna-BotV6**

💡 Control total de tu grupo con comandos fáciles de usar, diseñados para administradores:

| Función | Descripción |
|---------|-------------|
| 🔒 **Cerrar Grupo** | Solo los admins pueden enviar mensajes. ¡Mantén el grupo seguro! |
| 🔓 **Abrir Grupo** | Todos los miembros pueden chatear libremente. |
| 🚫 **Anti-Link** | Bloquea enlaces no deseados automáticamente. |
| ⚠️ **Anti-Tóxico** | Detecta y elimina mensajes inapropiados para mantener la armonía. |
| 👋 **Bienvenida** | Saluda a los usuarios nuevos y hazlos sentir parte del grupo. |
| 🎵 **Audios del Bot** | Activa o desactiva los audios y sonidos del bot. |
| ❌ **Eliminar Participantes** | Expulsa miembros que rompan las reglas del grupo. |
| ➕ **Agregar Participantes** | Invita nuevos miembros fácilmente. |
| 👑 **Dar Admin** | Otorga permisos de administrador a un usuario. |
| ❌👑 **Quitar Admin** | Revoca los permisos de administrador de un miembro. |
| 📝 **Cambiar Descripción** | Modifica la descripción del grupo en segundos. |
| 🖼️ **Cambiar Foto** | Actualiza la foto del grupo con facilidad. |
| 💫 **¡Y mucho más!** | Nuevas funciones y comandos se agregan constantemente 😉 |

---

## 🛡️ Sistema Integrado de **Luna-BotV6**

<div align="center">

| 🚫 Baneo | ⚡ Anti-Duplicados | 🛑 Anti-Spam |
|:--------:|:----------------:|:------------:|
| ![Baneo](https://img.shields.io/badge/🚫-Baneo-FF4500?style=for-the-badge&logo=forbidden&logoColor=white&labelColor=FF6347) <br> Detecta usuarios baneados y muestra la razón o plugin | ![AntiDuplicados](https://img.shields.io/badge/⚡-AntiDuplicados-1E90FF?style=for-the-badge&logo=repeat&logoColor=white&labelColor=1E90FF) <br> Evita mensajes idénticos repetidos | ![AntiSpam](https://img.shields.io/badge/🛑-Anti-Spam-DC143C?style=for-the-badge&logo=protection&logoColor=white&labelColor=DC143C) <br> Bloquea usuarios que envían spam |

| 📞 Anti-Llamada | ⏱️ Delay | 📱 Compatibilidad |
|:--------------:|:---------:|:----------------:|
| ![AntiLlamada](https://img.shields.io/badge/📞-Anti-Llamada-32CD32?style=for-the-badge&logo=phone&logoColor=white&labelColor=32CD32) <br> Evita interrupciones por llamadas | ![Delay](https://img.shields.io/badge/⏱️-Delay-FFD700?style=for-the-badge&logo=timer&logoColor=black&labelColor=FFD700) <br> Controla la frecuencia de comandos | ![Compatibilidad](https://img.shields.io/badge/📱-Android_iOS-9400D3?style=for-the-badge&logo=mobile&logoColor=white&labelColor=9400D3) <br> Funciona en Android y iPhone |

| 🧹 Limpieza | 🔌 Reconexión | 💫 Más funciones |
|:-----------:|:------------:|:---------------:|
| ![Limpieza](https://img.shields.io/badge/🧹-Archivos-20B2AA?style=for-the-badge&logo=cleaning&logoColor=white&labelColor=20B2AA) <br> Limpia archivos innecesarios automáticamente | ![Reconexión](https://img.shields.io/badge/🔌-Reconexión-FF69B4?style=for-the-badge&logo=power&logoColor=white&labelColor=FF69B4) <br> Reconecta automáticamente si se cae | ![MuchoMas](https://img.shields.io/badge/💫-Nuevas_Funciones-000000?style=for-the-badge&logo=arcade&logoColor=white&labelColor=000000) <br> Se agregan nuevas funciones constantemente 😉 |

</div>


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
| **RAM** | 500MB | Memoria mínima |
| **Almacenamiento** | 1.5GB | Espacio libre |

### 🌐 **Requisitos de Red**

- Conexión estable a internet
- Puerto 80/443 abierto (para webhooks)
- Latencia baja para mejor rendimiento

---

## Despliegue en BoxMineWorld

[![Logo BoxMineWorld](https://boxmineworld.com/images/Logo.png)](https://boxmineworld.com)

<details>
  <summary><b>:paperclip: Enlaces Importantes</b></summary>

- **Sitio Web:** [https://boxmineworld.com](https://boxmineworld.com)  
- **Área de Clientes:** [https://dash.boxmineworld.com](https://dash.boxmineworld.com)  
- **Panel de Control:** [https://panel.boxmineworld.com](https://panel.boxmineworld.com)  
- **Documentación:** [https://docs.boxmineworld.com](https://docs.boxmineworld.com)  
- **Comunidad de Discord:** [¡Únete aquí!](https://discord.gg/84qsr4v)

</details>

---

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
[![Facebook](https://img.shields.io/badge/Facebook-1877F2?style=for-the-badge&logo=facebook&logoColor=white)](https://www.facebook.com/profile.php?id=61580601092491)

**📱 WhatsApp:** `+54 9 348 346 6763`  
**💬 Discord:** `german_coto`  
**📧 Email:** `lunabotv6@gmail.com`  
**🌐 Facebook:** [Luna-Botv6](https://www.facebook.com/profile.php?id=61580601092491)

</div>

---


## 🙏 Reconocimientos

Este proyecto está basado en el excelente trabajo de:

- **[Mystic-Bot-MD](https://github.com/BrunoSobrino/TheMystic-Bot-MD)** por [Bruno Sobrino](https://github.com/BrunoSobrino)

Un agradecimiento especial a toda la comunidad que hace posible este proyecto.

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

- ---

## ❤️ ¿Quieres donar?

Si te gustaría apoyar el desarrollo de Luna Bot, puedes hacerlo de corazón (aunque no es necesario 😊).  
Tu apoyo ayuda a mantener el proyecto vivo, actualizado y lleno de nuevas funciones.

<div align="center">

### 💳 Opciones de Donación

[![PayPal](https://img.shields.io/badge/PayPal-Donar-003087?style=for-the-badge&logo=paypal&logoColor=white)](mailto:gercoto17@gmail.com)  
**PayPal (correo directo):** gercoto17@gmail.com  

[![Mercado Pago](https://img.shields.io/badge/Mercado%20Pago-Donar-00A8E0?style=for-the-badge&logo=mercadopago&logoColor=white)](#)  
**Mercado Pago (usuario):** german.elias.23  

**¡Gracias por tu apoyo! 🙌**

</div>


---

<div align="center">
  
  **🌙 Hecho con ❤️ por Germán Miño para la comunidad de WhatsApp**
  
  [![GitHub](https://img.shields.io/badge/GitHub-Luna--Bot-black?style=flat-square&logo=github)](https://github.com/Luna-botv6/Luna-Botv6-Project)
  [![WhatsApp](https://img.shields.io/badge/WhatsApp-Channel-25D366?style=flat-square&logo=whatsapp)](https://whatsapp.com/channel/0029VbANyNuLo4hedEWlvJ3Y)
  
</div>
