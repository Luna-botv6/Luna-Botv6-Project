import axios from 'axios';

const handler = async (m, {args}) => {
  const datas = global;
  const idioma = datas.db.data.users[m.sender].language || global.defaultLenguaje;
  const _translate = JSON.parse(fs.readFileSync(`./src/languages/${idioma}.json`));
  const tradutor = _translate.plugins.herramientas_clima;

  if (!args.length) throw tradutor.texto1;
  try {
    const ciudad = args.join(' ');
    const {data: geo} = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {q: ciudad, format: 'json', limit: 1, addressdetails: 1, accept_language: 'es,en'},
      timeout: 10000,
      headers: {'User-Agent': 'Luna-Bot/1.0'}
    });
    if (!geo || !geo.length) return tradutor.texto3;
    const lugar = geo[0];
    const {data: res} = await axios.get('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude: parseFloat(lugar.lat).toFixed(4),
        longitude: parseFloat(lugar.lon).toFixed(4),
        current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m',
        daily: 'temperature_2m_max,temperature_2m_min',
        timezone: 'auto'
      },
      timeout: 15000
    });
    const estado = (code) => code === 0 ? 'soleado' : [1, 2, 3].includes(code) ? 'parcialmente nublado' : [45, 48].includes(code) ? 'neblina' : [51, 53, 55, 56, 57].includes(code) ? 'llovizna' : [61, 63, 65, 66, 67].includes(code) ? 'lluvia' : [71, 73, 75, 77].includes(code) ? 'nieve' : [80, 81, 82].includes(code) ? 'chubascos' : [85, 86].includes(code) ? 'nevadas' : [95, 96, 99].includes(code) ? 'tormenta' : 'desconocido';
    const current = res.current;
    const daily = res.daily;
    const name = lugar.display_name.split(',')[0] || lugar.name;
    const Country = lugar.address?.country || '';
    const wea = `${tradutor.texto2[0]} ${name}\n${tradutor.texto2[1]} ${Country}\n${tradutor.texto2[2]} ${estado(current.weather_code)}\n${tradutor.texto2[3]} ${current.temperature_2m}°C\n${tradutor.texto2[4]} ${daily.temperature_2m_min[0]}°C\n${tradutor.texto2[5]} ${daily.temperature_2m_max[0]}°C\n${tradutor.texto2[6]} ${current.relative_humidity_2m}%\n${tradutor.texto2[7]} ${current.wind_speed_10m} km/h`;
    m.reply(wea);
  } catch {
    return tradutor.texto3;
  }
};
handler.help = ['clima *<ciudad/país>*'];
handler.tags = ['herramientas'];
handler.command = /^(clima|tiempo)$/i;
export default handler;