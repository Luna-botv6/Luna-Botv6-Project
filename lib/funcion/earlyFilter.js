export function hasPrefix(text, globalPrefix) {
  if (!text || typeof text !== 'string') return false;
  
  try {
    if (globalPrefix instanceof RegExp) {
      return globalPrefix.test(text);
    }
    
    if (Array.isArray(globalPrefix)) {
      return globalPrefix.some(p => {
        if (p instanceof RegExp) return p.test(text);
        return text.startsWith(p);
      });
    }
    
    if (typeof globalPrefix === 'string') {
      return text.startsWith(globalPrefix);
    }
    
    const prefixPattern = /^[*/i!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.\-.@]/;
    return prefixPattern.test(text);
  } catch {
    return false;
  }
}