import axios from 'axios';

const WEATHER_KEYWORDS = [
  'clima', 'weather', 'tiempo', 'temperatura', 'lluvia', 'sol', 'nublado',
  'pronostico', 'pronóstico', 'que tiempo hace', 'como esta el clima',
  'va a llover', 'hace frio', 'hace calor', 'esta lloviendo', 'clima de',
  'tiempo en', 'temperatura de', 'pronostico de', 'clima en',
  'weather in', 'climate in', 'temperature in', 'forecast for',
  'tempo em', 'clima em', 'temperatura em', 'previsão do tempo',
  'météo', 'climat', 'température', 'prévisions météo'
];


const locationCache = new Map();

function getWeatherEmoji(weathercode) {
  if (weathercode === 0) return '☀️';
  if ([1, 2, 3].includes(weathercode)) return '⛅';
  if ([45, 48].includes(weathercode)) return '🌫️';
  if ([51, 53, 55, 56, 57].includes(weathercode)) return '🌦️';
  if ([61, 63, 65, 66, 67].includes(weathercode)) return '🌧️';
  if ([71, 73, 75, 77].includes(weathercode)) return '❄️';
  if ([80, 81, 82].includes(weathercode)) return '🌦️';
  if ([85, 86].includes(weathercode)) return '❄️';
  if ([95, 96, 99].includes(weathercode)) return '⛈️';
  return '🌤️';
}

function getWeatherDescription(weathercode, language = 'es') {
  const descriptions = {
    es: {
      0: 'Despejado', 1: 'Mayormente despejado', 2: 'Parcialmente nublado', 3: 'Nublado',
      45: 'Neblina', 48: 'Niebla con escarcha', 51: 'Llovizna ligera', 53: 'Llovizna moderada',
      55: 'Llovizna intensa', 56: 'Llovizna helada ligera', 57: 'Llovizna helada intensa',
      61: 'Lluvia ligera', 63: 'Lluvia moderada', 65: 'Lluvia intensa',
      66: 'Lluvia helada ligera', 67: 'Lluvia helada intensa', 71: 'Nieve ligera',
      73: 'Nieve moderada', 75: 'Nieve intensa', 77: 'Granizo', 80: 'Chubascos ligeros',
      81: 'Chubascos moderados', 82: 'Chubascos intensos', 85: 'Chubascos de nieve ligeros',
      86: 'Chubascos de nieve intensos', 95: 'Tormenta', 96: 'Tormenta con granizo ligero',
      99: 'Tormenta con granizo intenso'
    },
    en: {
      0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
      45: 'Fog', 48: 'Depositing rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
      55: 'Dense drizzle', 56: 'Light freezing drizzle', 57: 'Dense freezing drizzle',
      61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
      66: 'Light freezing rain', 67: 'Heavy freezing rain', 71: 'Slight snow',
      73: 'Moderate snow', 75: 'Heavy snow', 77: 'Snow grains', 80: 'Slight rain showers',
      81: 'Moderate rain showers', 82: 'Violent rain showers', 85: 'Slight snow showers',
      86: 'Heavy snow showers', 95: 'Thunderstorm', 96: 'Thunderstorm with slight hail',
      99: 'Thunderstorm with heavy hail'
    }
  };
  return descriptions[language]?.[weathercode] || descriptions['es'][weathercode] || 'Condición desconocida';
}

function canHandle(text) {
  const lowerText = text.toLowerCase();
  return WEATHER_KEYWORDS.some(keyword => lowerText.includes(keyword));
}

function extractWeatherLocation(text) {
  const lowerText = text.toLowerCase();
  

  const patterns = [
    /(?:clima|weather|tiempo|tempo|météo)\s+(?:de|del|en|in|em|à)\s+([a-záéíóúñç\s,.-]+)/i,
    /(?:temperatura|temperature)\s+(?:de|del|en|in|em|à)\s+([a-záéíóúñç\s,.-]+)/i,
    /(?:pronóstico|pronostico|forecast|previsão|prévisions)\s+(?:de|del|en|in|em|pour)\s+([a-záéíóúñç\s,.-]+)/i,
    /(?:que\s+tiempo\s+hace|how\s+is\s+the\s+weather)\s+(?:en|in)\s+([a-záéíóúñç\s,.-]+)/i,
    /(?:como\s+esta\s+el\s+clima)\s+(?:en|de)\s+([a-záéíóúñç\s,.-]+)/i
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  
  for (const keyword of WEATHER_KEYWORDS) {
    const index = lowerText.indexOf(keyword);
    if (index !== -1) {
      const afterKeyword = text.substring(index + keyword.length).trim();
      const prepositions = ['de', 'del', 'en', 'in', 'em', 'à', 'pour', 'para'];
      const words = afterKeyword.split(' ');
      
      if (words.length > 0 && prepositions.includes(words[0].toLowerCase())) {
        const location = words.slice(1).join(' ').trim();
        if (location.length > 2) return location;
      }
      
      
      if (afterKeyword.length > 2) {
        const location = afterKeyword.split(' ').slice(0, 3).join(' ').trim();
        return location;
      }
    }
  }
  
  return null;
}

async function geocodeLocation(locationName) {
  try {
    
    const cacheKey = locationName.toLowerCase();
    if (locationCache.has(cacheKey)) {
      return locationCache.get(cacheKey);
    }

    
    const geocodeResponse = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: locationName,
        format: 'json',
        limit: 1,
        addressdetails: 1,
        accept_language: 'es,en'
      },
      timeout: 10000,
      headers: {
        'User-Agent': 'Luna-Botv6-WeatherBot/1.0'
      }
    });

    if (!geocodeResponse.data || geocodeResponse.data.length === 0) {
      throw new Error('Ubicación no encontrada');
    }

    const result = geocodeResponse.data[0];
    const locationData = {
      name: result.display_name.split(',')[0] || result.name,
      fullName: result.display_name,
      country: result.address?.country || 'Desconocido',
      state: result.address?.state || result.address?.province || '',
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon)
    };

    
    locationCache.set(cacheKey, locationData);
    
    return locationData;
    
  } catch (error) {
    console.error('Error en geocodificación:', error.message);
    throw new Error(`No se pudo encontrar la ubicación: ${locationName}`);
  }
}

async function getWeatherInfo(locationName) {
  try {
    
    const locationData = await geocodeLocation(locationName);
    const { latitude, longitude } = locationData;

    
    const weatherResponse = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: latitude.toFixed(4),
        longitude: longitude.toFixed(4),
        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,pressure_msl',
        daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max',
        timezone: 'auto',
        forecast_days: 5
      },
      timeout: 15000
    });

    const current = weatherResponse.data.current;
    const daily = weatherResponse.data.daily;
    const units = weatherResponse.data.current_units;
    
    const weatherEmoji = getWeatherEmoji(current.weather_code);
    const weatherDesc = getWeatherDescription(current.weather_code);
    
    let weatherMessage = `🌤️ **CLIMA EN ${locationData.name.toUpperCase()}** 🌤️\n\n`;
    weatherMessage += `📍 **Ubicación:** ${locationData.fullName}\n`;
    weatherMessage += `🌍 **País:** ${locationData.country}\n`;
    weatherMessage += `📊 **Coordenadas:** ${latitude.toFixed(2)}, ${longitude.toFixed(2)}\n\n`;
    
    weatherMessage += `${weatherEmoji} **CLIMA ACTUAL:**\n`;
    weatherMessage += `🌡️ **Temperatura:** ${current.temperature_2m}°C\n`;
    weatherMessage += `🌡️ **Sensación térmica:** ${current.apparent_temperature}°C\n`;
    weatherMessage += `☁️ **Condición:** ${weatherDesc}\n`;
    weatherMessage += `💧 **Humedad:** ${current.relative_humidity_2m}%\n`;
    weatherMessage += `💨 **Viento:** ${current.wind_speed_10m} km/h\n`;
    weatherMessage += `🔽 **Presión:** ${current.pressure_msl} hPa\n\n`;
    
    weatherMessage += `📅 **PRONÓSTICO EXTENDIDO (5 DÍAS):**\n\n`;
    
    const days = ['Hoy', 'Mañana', 'Pasado mañana'];
    for (let i = 0; i < Math.min(5, daily.time.length); i++) {
      const date = new Date(daily.time[i]);
      let dayName;
      
      if (i < days.length) {
        dayName = days[i];
      } else {
        dayName = date.toLocaleDateString('es-ES', { weekday: 'long' });
      }
      
      const emoji = getWeatherEmoji(daily.weather_code[i]);
      const desc = getWeatherDescription(daily.weather_code[i]);
      const dateStr = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
      
      weatherMessage += `${emoji} **${dayName.charAt(0).toUpperCase() + dayName.slice(1)}** (${dateStr})\n`;
      weatherMessage += `🌡️ Max: ${daily.temperature_2m_max[i]}°C | Min: ${daily.temperature_2m_min[i]}°C\n`;
      weatherMessage += `☁️ ${desc}\n`;
      weatherMessage += `🌧️ Lluvia: ${daily.precipitation_probability_max[i] || 0}%`;
      
      if (daily.precipitation_sum[i] > 0) {
        weatherMessage += ` (${daily.precipitation_sum[i]}mm)`;
      }
      
      weatherMessage += `\n💨 Viento máx: ${daily.wind_speed_10m_max[i]} km/h\n`;
      if (i < 4) weatherMessage += `\n`;
    }

    weatherMessage += `\n🌙 *Luna-Botv6-Project - Clima Global*\n`;
    weatherMessage += `📡 *Datos: Open-Meteo API | Geocoding: OpenStreetMap*\n`;
    weatherMessage += `⏰ *Actualizado: ${new Date().toLocaleString('es-ES')}*`;
    
    return weatherMessage;

  } catch (error) {
    console.error('Error obteniendo clima:', error.message);
    throw error;
  }
}

async function handle(inputText, context) {
  const { conn, msg, jid } = context;
  
  await conn.sendMessage(jid, { 
    text: '🌤️ *Buscando ubicación y obteniendo clima...* 🌤️' 
  }, { quoted: msg });

  try {
    const location = extractWeatherLocation(inputText);
    
    if (!location) {
      const helpMessage = `⚠️ **Luna-Botv6-Project** 🌙\n\n` +
        `No pude identificar la ubicación. Por favor especifica una ciudad o país.\n\n` +
        `💡 **Ejemplos de uso:**\n` +
        `• "clima de México"\n` +
        `• "tiempo en Buenos Aires"\n` +
        `• "temperatura de Lima"\n` +
        `• "pronóstico de Guatemala"\n` +
        `• "weather in New York"\n` +
        `• "clima de Bogotá, Colombia"\n\n` +
        `🌍 **Funciona con cualquier ciudad del mundo**`;
        
      await conn.sendMessage(jid, { text: helpMessage }, { quoted: msg });
      return;
    }

    const weatherInfo = await getWeatherInfo(location);
    await conn.sendMessage(jid, { text: weatherInfo }, { quoted: msg });
    
  } catch (weatherError) {
    console.error('Error obteniendo clima:', weatherError.message);
    let errorMessage = `⚠️ **Luna-Botv6-Project** 🌙\n\n`;
    
    if (weatherError.message.includes('Ubicación no encontrada') || 
        weatherError.message.includes('No se pudo encontrar la ubicación')) {
      errorMessage += `❌ No pude encontrar la ubicación especificada.\n\n`;
      errorMessage += `💡 **Consejos:**\n`;
      errorMessage += `• Verifica la ortografía\n`;
      errorMessage += `• Usa el nombre completo de la ciudad\n`;
      errorMessage += `• Incluye el país si es necesario\n`;
      errorMessage += `• Ejemplo: "clima de Medellín, Colombia"\n\n`;
      errorMessage += `🌍 **Funciona con ciudades de todo el mundo**`;
    } else if (weatherError.message.includes('timeout') || weatherError.message.includes('ETIMEDOUT')) {
      errorMessage += `⏱️ La consulta está tardando más de lo normal.\n\n🔄 Intenta nuevamente en unos segundos.`;
    } else {
      errorMessage += `🔧 Error temporal obteniendo información del clima.\n\n🔄 Intenta de nuevo en unos momentos.`;
    }
    
    await conn.sendMessage(jid, { text: errorMessage }, { quoted: msg });
  }
}

export default { 
  canHandle, 
  handle, 
  name: 'global-weather', 
  description: 'Plugin para obtener información del clima de cualquier ciudad del mundo' 
};