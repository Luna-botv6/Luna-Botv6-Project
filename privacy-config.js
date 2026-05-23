import fs from 'fs'
import path from 'path'

export const privacyConfig = {
    dataRetention: {
        enabled: true,
        days: 30,
        autoCleanup: true
    },
    userConsent: {
        required: false,
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
}

export function cleanOldUserData() {
    const USERS_DIR = './database/users'
    const retentionDays = privacyConfig.dataRetention.days
    const cutoffTime = Date.now() - (retentionDays * 24 * 60 * 60 * 1000)

    try {
        if (!fs.existsSync(USERS_DIR)) return
        const files = fs.readdirSync(USERS_DIR).filter(f => f.endsWith('.json') && !f.startsWith('.'))
        let cleaned = 0
        for (const file of files) {
            const fp = path.join(USERS_DIR, file)
            try {
                const data = JSON.parse(fs.readFileSync(fp, 'utf8'))
                if (data.lastActivity && data.lastActivity < cutoffTime) {
                    const minimal = {
                        registered: data.registered,
                        name: data.name,
                        lastActivity: data.lastActivity,
                        language: data.language
                    }
                    fs.writeFileSync(fp, JSON.stringify(minimal))
                    cleaned++
                }
            } catch {}
        }
        if (cleaned > 0) console.log(`[PRIVACY] ${cleaned} usuarios inactivos compactados`)
    } catch (e) {
        console.error('[PRIVACY] Error en limpieza:', e.message)
    }
}

export const secureLogger = {
    info: (...args) => {
        const sanitized = args.map(a => typeof a === 'string' ? a.replace(/\+?\d{10,15}/g, '[PHONE]') : a)
        console.log('[INFO]', ...sanitized)
    },
    error: (...args) => {
        const sanitized = args.map(a => typeof a === 'string' ? a.replace(/\+?\d{10,15}/g, '[PHONE]') : a)
        console.error('[ERROR]', ...sanitized)
    },
    warn: (...args) => {
        const sanitized = args.map(a => typeof a === 'string' ? a.replace(/\+?\d{10,15}/g, '[PHONE]') : a)
        console.warn('[WARN]', ...sanitized)
    }
}
