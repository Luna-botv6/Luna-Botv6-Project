import { generateWAMessageFromContent } from '@whiskeysockets/baileys';

const handler = async (m, { conn, usedPrefix, command, args }) => {
  const text = args.join(' ') || '';
  
  // Comando: listbutton o lb
  if (command === 'listbutton' || command === 'lb') {
    const message = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2
          },
          interactiveMessage: {
            body: {
              text: `🎯 *Lista de Botones - Prueba*\n\n${text || 'Selecciona una opción de la lista:'}`
            },
            footer: {
              text: '🤖 Luna-BotV6 | Powered by Baileys'
            },
            header: {
              title: '📋 *MENÚ INTERACTIVO*',
              subtitle: 'Selecciona una opción',
              hasMediaAttachment: false
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: 'single_select',
                  buttonParamsJson: JSON.stringify({
                    title: '🎮 Ver Opciones',
                    sections: [
                      {
                        title: '🎯 Comandos Principales',
                        highlight_label: 'Populares',
                        rows: [
                          {
                            header: '🎵 Música',
                            title: 'Descargar música',
                            description: 'Descargar canciones de YouTube',
                            id: `${usedPrefix}play`
                          },
                          {
                            header: '📱 Stickers',
                            title: 'Crear sticker',
                            description: 'Convertir imagen a sticker',
                            id: `${usedPrefix}sticker`
                          },
                          {
                            header: '🎲 Juegos',
                            title: 'Jugar dados',
                            description: 'Lanzar dados virtuales',
                            id: `${usedPrefix}dado`
                          }
                        ]
                      },
                      {
                        title: '🛠️ Herramientas',
                        rows: [
                          {
                            header: '🌐 Traductor',
                            title: 'Traducir texto',
                            description: 'Traducir texto a diferentes idiomas',
                            id: `${usedPrefix}translate`
                          },
                          {
                            header: '📊 Información',
                            title: 'Info del grupo',
                            description: 'Ver información del grupo actual',
                            id: `${usedPrefix}infogroup`
                          },
                          {
                            header: '🎭 Diversión',
                            title: 'Generar meme',
                            description: 'Crear memes divertidos',
                            id: `${usedPrefix}meme`
                          }
                        ]
                      },
                      {
                        title: '⚙️ Configuración',
                        rows: [
                          {
                            header: '🔧 Ajustes',
                            title: 'Configurar bot',
                            description: 'Cambiar configuración del bot',
                            id: `${usedPrefix}config`
                          },
                          {
                            header: '📋 Ayuda',
                            title: 'Ver ayuda',
                            description: 'Mostrar comandos disponibles',
                            id: `${usedPrefix}help`
                          }
                        ]
                      }
                    ]
                  })
                }
              ]
            }
          }
        }
      }
    }, { quoted: m });

    await conn.relayMessage(m.chat, message.message, {
      messageId: message.key.id
    });
  }
  
  // Comando: buttontest o bt - Botones simples
  else if (command === 'buttontest' || command === 'bt') {
    const message = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2
          },
          interactiveMessage: {
            body: {
              text: `🔘 *Botones Simples - Prueba*\n\n${text || 'Presiona uno de los botones:'}`
            },
            footer: {
              text: '🤖 Luna-BotV6 | Test de Botones'
            },
            header: {
              title: '🎯 *BOTONES DE PRUEBA*',
              subtitle: 'Elige una opción',
              hasMediaAttachment: false
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: 'quick_reply',
                  buttonParamsJson: JSON.stringify({
                    display_text: '🎵 Música',
                    id: `${usedPrefix}play Never Gonna Give You Up`
                  })
                },
                {
                  name: 'quick_reply', 
                  buttonParamsJson: JSON.stringify({
                    display_text: '🎲 Dados',
                    id: `${usedPrefix}dado`
                  })
                },
                {
                  name: 'quick_reply',
                  buttonParamsJson: JSON.stringify({
                    display_text: '📋 Menú',
                    id: `${usedPrefix}menu`
                  })
                }
              ]
            }
          }
        }
      }
    }, { quoted: m });

    await conn.relayMessage(m.chat, message.message, {
      messageId: message.key.id
    });
  }
  
  // Comando: menubot - Menú completo con botones
  else if (command === 'menubot') {
    const message = generateWAMessageFromContent(m.chat, {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2
          },
          interactiveMessage: {
            body: {
              text: `🌙 *Luna-BotV6 - Menú Principal*\n\n¡Hola! Soy Luna-Bot, tu asistente virtual.\n\n${text || 'Selecciona una categoría para explorar:'}`
            },
            footer: {
              text: '🤖 Powered by Luna-BotV6 | Baileys'
            },
            header: {
              title: '🌟 *BIENVENIDO A LUNA-BOT*',
              subtitle: 'Tu asistente virtual favorito',
              hasMediaAttachment: false
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: 'single_select',
                  buttonParamsJson: JSON.stringify({
                    title: '📋 Explorar Menú',
                    sections: [
                      {
                        title: '🎯 Entretenimiento',
                        highlight_label: 'Popular',
                        rows: [
                          {
                            header: '🎵 Música & Audio',
                            title: 'Descargas de música',
                            description: 'YouTube, Spotify, SoundCloud',
                            id: `${usedPrefix}menumusic`
                          },
                          {
                            header: '🎮 Juegos',
                            title: 'Mini juegos',
                            description: 'Dados, adivinanzas, trivia',
                            id: `${usedPrefix}menugames`
                          },
                          {
                            header: '🎭 Diversión',
                            title: 'Comandos divertidos',
                            description: 'Memes, chistes, frases',
                            id: `${usedPrefix}menufun`
                          }
                        ]
                      },
                      {
                        title: '🛠️ Utilidades',
                        rows: [
                          {
                            header: '📱 Stickers',
                            title: 'Crear stickers',
                            description: 'Convertir imágenes a stickers',
                            id: `${usedPrefix}menusticker`
                          },
                          {
                            header: '🌐 Traductor',
                            title: 'Traducir idiomas',
                            description: 'Traducir texto a cualquier idioma',
                            id: `${usedPrefix}tr es Hello world`
                          },
                          {
                            header: '🔍 Búsquedas',
                            title: 'Buscar información',
                            description: 'Google, Wikipedia, imágenes',
                            id: `${usedPrefix}menusearch`
                          }
                        ]
                      },
                      {
                        title: '👥 Grupo',
                        rows: [
                          {
                            header: '⚙️ Administración',
                            title: 'Herramientas de admin',
                            description: 'Kick, ban, promover usuarios',
                            id: `${usedPrefix}menuadmin`
                          },
                          {
                            header: '📊 Información',
                            title: 'Info del grupo',
                            description: 'Miembros, reglas, estadísticas',
                            id: `${usedPrefix}infogroup`
                          }
                        ]
                      },
                      {
                        title: '🔧 Configuración',
                        rows: [
                          {
                            header: '⚙️ Ajustes',
                            title: 'Configurar bot',
                            description: 'Personalizar comportamiento',
                            id: `${usedPrefix}settings`
                          },
                          {
                            header: '📋 Ayuda',
                            title: 'Soporte',
                            description: 'Comandos, contacto, info',
                            id: `${usedPrefix}help`
                          }
                        ]
                      }
                    ]
                  })
                },
                {
                  name: 'quick_reply',
                  buttonParamsJson: JSON.stringify({
                    display_text: '🎵 Música Rápida',
                    id: `${usedPrefix}play`
                  })
                },
                {
                  name: 'quick_reply',
                  buttonParamsJson: JSON.stringify({
                    display_text: '🎲 Juego Rápido',
                    id: `${usedPrefix}dado`
                  })
                }
              ]
            }
          }
        }
      }
    }, { quoted: m });

    await conn.relayMessage(m.chat, message.message, {
      messageId: message.key.id
    });
  }
};

// Configuración del plugin
handler.command = /^(listbutton|buttontest|bt|menubot)$/i;
handler.help = ['listbutton', 'buttontest', 'menubot'];
handler.tags = ['test', 'menu'];
handler.exp = 0;
handler.register = false;

export default handler;
