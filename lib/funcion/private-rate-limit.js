import fs from 'fs';
import path from 'path';

const DB_PATH = './database/private-rate-limit.json';
const CONFIG_PATH = './database/private-rate-limit-config.json';

const DEFAULT_CONFIG = {
  maxMessagesPerMinute: 10,
  cooldownBetweenMessages: 2000,
  maxTotalPerHour: 50
};

let rateLimitData = {};
let config = { ...DEFAULT_CONFIG };

function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      rateLimitData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    } else {
      rateLimitData = {};
      saveDB();
    }
  } catch (e) {
    console.error('[PrivateRateLimit] Error cargando DB:', e.message);
    rateLimitData = {};
  }
}

function saveDB() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(rateLimitData, null, 2));
  } catch (e) {
    console.error('[PrivateRateLimit] Error guardando DB:', e.message);
  }
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      config = { ...DEFAULT_CONFIG, ...saved };
    } else {
      config = { ...DEFAULT_CONFIG };
      saveConfig();
    }
  } catch (e) {
    console.error('[PrivateRateLimit] Error cargando config:', e.message);
    config = { ...DEFAULT_CONFIG };
  }
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (e) {
    console.error('[PrivateRateLimit] Error guardando config:', e.message);
  }
}

function getUserData(sender) {
  if (!rateLimitData[sender]) {
    rateLimitData[sender] = {
      messages: [],
      lastMessageTime: 0,
      blockedUntil: 0,
      warningCount: 0
    };
  }
  return rateLimitData[sender];
}

function cleanupOldData(userData) {
  const now = Date.now();
  const oneMinuteAgo = now - 60000;
  const oneHourAgo = now - 3600000;
  
  userData.messages = userData.messages.filter(time => time > oneHourAgo);
  userData.messagesLastMinute = userData.messages.filter(time => time > oneMinuteAgo);
}

export function checkRateLimit(sender) {
  const userData = getUserData(sender);
  const now = Date.now();
  
  cleanupOldData(userData);
  
  if (userData.blockedUntil > now) {
    const remainingTime = Math.ceil((userData.blockedUntil - now) / 1000);
    return {
      allowed: false,
      reason: 'blocked',
      remainingTime,
      message: null
    };
  }
  
  userData.messagesLastMinute = userData.messages.filter(time => time > (now - 60000));
  
  if (userData.messagesLastMinute.length >= config.maxMessagesPerMinute) {
    userData.blockedUntil = now + 60000;
    userData.warningCount++;
    saveDB();
    return {
      allowed: false,
      reason: 'rate_limit_minute',
      message: `⚠️ Has excedido el límite de ${config.maxMessagesPerMinute} mensajes por minuto. Espera 1 minuto.`
    };
  }
  
  if (userData.messages.length >= config.maxTotalPerHour) {
    userData.blockedUntil = now + 3600000;
    userData.warningCount++;
    saveDB();
    return {
      allowed: false,
      reason: 'rate_limit_hour',
      message: `⚠️ Has excedido el límite de ${config.maxTotalPerHour} mensajes por hora. Espera 1 hora.`
    };
  }
  
  if (userData.lastMessageTime > 0 && (now - userData.lastMessageTime) < config.cooldownBetweenMessages) {
    const remainingCooldown = Math.ceil((config.cooldownBetweenMessages - (now - userData.lastMessageTime)) / 1000);
    return {
      allowed: false,
      reason: 'cooldown',
      remainingTime: remainingCooldown,
      message: `⏱️ Espera ${remainingCooldown} segundos entre mensajes.`
    };
  }
  
  return { allowed: true };
}

export function recordMessage(sender) {
  const userData = getUserData(sender);
  const now = Date.now();
  
  userData.messages.push(now);
  userData.lastMessageTime = now;
  
  saveDB();
}

export function resetUser(sender) {
  if (rateLimitData[sender]) {
    delete rateLimitData[sender];
    saveDB();
  }
}

export function getConfig() {
  return { ...config };
}

export function updateConfig(newConfig) {
  config = { ...config, ...newConfig };
  saveConfig();
  return config;
}

export function getStats(sender) {
  const userData = getUserData(sender);
  const now = Date.now();
  
  cleanupOldData(userData);
  
  return {
    messagesLastMinute: userData.messagesLastMinute?.length || 0,
    messagesLastHour: userData.messages.length,
    warningCount: userData.warningCount,
    isBlocked: userData.blockedUntil > now,
    blockedUntil: userData.blockedUntil > now ? new Date(userData.blockedUntil) : null
  };
}

// --- Warm-up gradual para números nuevos ---
// Valores de partida propios, no son límites oficiales de WhatsApp — ajustar con .ratelimit si hace falta.
const WARMUP_DAYS = 7;
const WARMUP_START_CAP = 20;
const WARMUP_FULL_CAP = 300;
const WARMUP_PER_USER_CAP = 5; // tope diario por usuario individual durante el warm-up, para que uno solo no se coma todo el presupuesto global del día

function getAccountStartDate() {
  if (!config.accountStartDate) {
    config.accountStartDate = Date.now();
    saveConfig();
  }
  return config.accountStartDate;
}

function getGlobalDailyMessages() {
  if (!rateLimitData.__global_daily__) rateLimitData.__global_daily__ = [];
  const oneDayAgo = Date.now() - 86400000;
  rateLimitData.__global_daily__ = rateLimitData.__global_daily__.filter(t => t > oneDayAgo);
  return rateLimitData.__global_daily__;
}

function getUserWarmupMessages(sender) {
  if (!rateLimitData.__warmup_per_user__) rateLimitData.__warmup_per_user__ = {};
  if (!rateLimitData.__warmup_per_user__[sender]) rateLimitData.__warmup_per_user__[sender] = [];
  const oneDayAgo = Date.now() - 86400000;
  rateLimitData.__warmup_per_user__[sender] = rateLimitData.__warmup_per_user__[sender].filter(t => t > oneDayAgo);
  return rateLimitData.__warmup_per_user__[sender];
}

export function checkWarmupLimit(sender) {
  const startDate = getAccountStartDate();
  const daysSinceStart = (Date.now() - startDate) / 86400000;

  if (daysSinceStart >= WARMUP_DAYS) {
    return { allowed: true, inWarmup: false };
  }

  const messages = getGlobalDailyMessages();
  const cap = Math.round(WARMUP_START_CAP + (daysSinceStart / WARMUP_DAYS) * (WARMUP_FULL_CAP - WARMUP_START_CAP));
  const userMessages = sender ? getUserWarmupMessages(sender) : [];

  if (messages.length >= cap) {
    return { allowed: false, inWarmup: true, cap, sentToday: messages.length, userSentToday: userMessages.length, userCap: WARMUP_PER_USER_CAP, reason: 'global' };
  }

  if (sender) {
    if (userMessages.length >= WARMUP_PER_USER_CAP) {
      return { allowed: false, inWarmup: true, cap, sentToday: messages.length, userSentToday: userMessages.length, userCap: WARMUP_PER_USER_CAP, reason: 'per_user' };
    }
  }

  return { allowed: true, inWarmup: true, cap, sentToday: messages.length };
}

export function recordGlobalMessage(sender) {
  const messages = getGlobalDailyMessages();
  messages.push(Date.now());
  if (sender) {
    getUserWarmupMessages(sender).push(Date.now());
  }
  saveDB();
}

export function resetWarmup(sender) {
  if (sender) {
    if (rateLimitData.__warmup_per_user__) delete rateLimitData.__warmup_per_user__[sender];
  } else {
    rateLimitData.__global_daily__ = [];
  }
  saveDB();
}

// --- Tracking de interacciones entrantes (base para el patrón inbound-first) ---
// Por ahora solo registra; el gateo real de mensajes proactivos queda pendiente
// de ubicar en el resto del repo dónde se generan (broadcasts, recordatorios, etc).
export function recordIncomingMessage(sender) {
  const userData = getUserData(sender);
  userData.lastIncomingMessageTime = Date.now();
  userData.hasEverMessagedBot = true;
  saveDB();
}

export function hasUserMessagedBot(sender) {
  return !!rateLimitData[sender]?.hasEverMessagedBot;
}

loadDB();
loadConfig();
