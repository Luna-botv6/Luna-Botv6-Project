export function hasPrefix(text, globalPrefix) {
  if (!text || typeof text !== 'string') return false;
  
  try {
    const prefixRegex = globalPrefix instanceof RegExp 
      ? globalPrefix 
      : new RegExp('^[' + (globalPrefix || '').replace(/[|\\{}()[\]^$+*?.]/g, '\\$&') + ']');
    
    return prefixRegex.test(text);
  } catch {
    return false;
  }
}