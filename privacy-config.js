export const privacyConfig = {
    dataRetention: {
        enabled: true,
        days: 30,
        autoCleanup: true
    },
    userConsent: {
        required: false, // Cambiar a true si quieres activar consentimiento
        message: "🔒 Necesitamos tu consentimiento para procesar datos básicos del bot"
    },
    logging: {
        sanitizePhoneNumbers: true,
        sanitizeUserData: true,
        level: 'info'
    },
    storage: {
        minimizeDataCollection: true,
        autoDeleteMedia: true
    }
};

// Función para limpiar datos antiguos
export function cleanOldUserData() {
    if (!global.db?.data) return;
    
    const retentionDays = privacyConfig.dataRetention.days;
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);
    
    // Limpiar datos de usuarios inactivos
    Object.keys(global.db.data.users || {}).forEach(userId => {
        const user = global.db.data.users[userId];
        if (user && user.lastActivity && user.lastActivity < cutoffTime) {
            // Mantener solo datos esenciales
            global.db.data.users[userId] = {
                registered: user.registered,
                name: user.name,
                lastActivity: user.lastActivity
            };
        }
    });
    
    console.log('[PRIVACY] Limpieza de datos antiguos completada');
}

// Logger seguro que oculta información sensible
export const secureLogger = {
    info: (msg) => {
        if (!privacyConfig.logging.sanitizePhoneNumbers) {
            console.log('[INFO]', msg);
            return;
        }
        const sanitized = typeof msg === 'string' ? 
            msg.replace(/\+?\d{10,15}/g, '[PHONE_REDACTED]') : msg;
        console.log('[INFO]', sanitized);
    },
    error: (msg) => {
        if (!privacyConfig.logging.sanitizeUserData) {
            console.error('[ERROR]', msg);
            return;
        }
        const sanitized = typeof msg === 'string' ? 
            msg.replace(/\+?\d{10,15}/g, '[PHONE_REDACTED]') : msg;
        console.error('[ERROR]', sanitized);
    },
    warn: (msg) => {
        if (!privacyConfig.logging.sanitizeUserData) {
            console.warn('[WARN]', msg);
            return;
        }
        const sanitized = typeof msg === 'string' ? 
            msg.replace(/\+?\d{10,15}/g, '[PHONE_REDACTED]') : msg;
        console.warn('[WARN]', sanitized);
    }
};