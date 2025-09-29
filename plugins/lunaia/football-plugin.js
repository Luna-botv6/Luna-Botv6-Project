const FOOTBALL_KEYWORDS = [
  'futbol', 'fútbol', 'football', 'river', 'boca', 'racing', 'independiente',
  'san lorenzo', 'estudiantes', 'gimnasia', 'newells', 'rosario central',
  'cuando juega', 'próximo partido', 'proximo partido', 'fixture',
  'argentina', 'seleccion', 'selección', 'copa america', 'mundial',
  'liga profesional', 'primera división', 'primera division'
];

const FOOTBALL_TEAMS = {
  'river': 'River Plate', 'boca': 'Boca Juniors', 'racing': 'Racing Club',
  'independiente': 'Independiente', 'san lorenzo': 'San Lorenzo', 'estudiantes': 'Estudiantes',
  'gimnasia': 'Gimnasia y Esgrima La Plata', 'newells': 'Newell\'s Old Boys',
  'rosario central': 'Rosario Central', 'argentina': 'Selección Argentina',
  'seleccion': 'Selección Argentina', 'selección': 'Selección Argentina'
};

function canHandle(text) {
  const lowerText = text.toLowerCase();
  return FOOTBALL_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

async function getFootballInfo(query) {
  try {
    const queryLower = query.toLowerCase();
    let teamName = '';
    
    for (const [key, value] of Object.entries(FOOTBALL_TEAMS)) {
      if (queryLower.includes(key)) {
        teamName = value;
        break;
      }
    }

    if (!teamName) {
      return `⚽ **Luna-Botv6-Project** 🌙\n\n❓ No reconocí el equipo en tu consulta.\n\n🏆 **Equipos disponibles:**\n• River Plate, Boca Juniors\n• Racing, Independiente\n• San Lorenzo, Estudiantes\n• Gimnasia, Newell's\n• Selección Argentina\n\n💡 **Ejemplo:** "cuándo juega River"`;
    }

    let footballMessage = `⚽ **INFORMACIÓN DE FÚTBOL** ⚽\n\n🏆 **Equipo:** ${teamName}\n\n`;

    if (teamName === 'Selección Argentina') {
      footballMessage += `🇦🇷 **SELECCIÓN ARGENTINA** 🇦🇷\n\n🏆 **Últimos logros:**\n• 🏆 Copa del Mundo Qatar 2022\n• 🏆 Copa América 2021\n• 🏆 Finalissima 2022\n\n👑 **Capitán:** Lionel Messi\n👔 **DT:** Lionel Scaloni\n\n📅 **Próximos partidos:** Consulta la página oficial de AFA para fechas exactas\n🌐 **Web oficial:** https://www.afa.com.ar/\n\n`;
    } else {
      footballMessage += `🏟️ **LIGA PROFESIONAL ARGENTINA**\n\n📅 **Información de fixture:**\nPara obtener fechas exactas de partidos, consulta:\n• ESPN Argentina\n• TyC Sports\n• Sitio oficial de la Liga Profesional\n\n⏰ **Horarios habituales:**\n• Sábados y domingos: 15:30, 17:45, 20:00\n• Entre semana: 19:15, 21:30\n\n`;
    }

    footballMessage += `🌙 *Información proporcionada por Luna-Botv6-Project*`;
    return footballMessage;
  } catch (error) {
    console.error('Error obteniendo información de fútbol:', error.message);
    throw new Error(`Error obteniendo información de fútbol: ${error.message}`);
  }
}

async function handle(inputText, context) {
  const { conn, msg, jid } = context;
  
  await conn.sendMessage(jid, { text: '⚽ *Obteniendo información de fútbol...* ⚽' }, { quoted: msg });

  try {
    const footballInfo = await getFootballInfo(inputText);
    await conn.sendMessage(jid, { text: footballInfo }, { quoted: msg });
  } catch (footballError) {
    console.error('Error obteniendo información de fútbol:', footballError.message);
    await conn.sendMessage(jid, { text: '⚠️ *Luna-Botv6-Project*\n\nError temporal obteniendo información de fútbol. Intenta de nuevo.' }, { quoted: msg });
  }
}

export default { canHandle, handle, name: 'football', description: 'Plugin para información de fútbol argentino' };