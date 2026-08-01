const PLACEHOLDER_REGEX = /\b(bot|grupo|tag|razon|tags)\b/gi;

export function renderTagallTemplate(rawText, { bot, grupo, tag, razon, tags }) {
  const valores = { bot, grupo, tag, razon, tags };
  return rawText.replace(PLACEHOLDER_REGEX, (match) => {
    const valor = valores[match.toLowerCase()];
    return valor !== undefined && valor !== null ? valor : match;
  });
}
