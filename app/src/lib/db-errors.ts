/**
 * Détection des erreurs de connexion base de données (ex. Neon en pause, réseau).
 * Permet de dégrader proprement (pas de session) au lieu de faire exploser les logs.
 */

const PRISMA_CONNECTION_CODES = ['P1001', 'P1002', 'P1017'] as const
const CONNECTION_ERROR_MESSAGES = [
  "Can't reach database server",
  'Connection refused',
  'Connection timed out',
  'ECONNREFUSED',
  'ETIMEDOUT',
]

/** Vérifie si l'erreur correspond à une base injoignable (Neon en pause, réseau, etc.). */
export function isDatabaseUnreachable(error: unknown): boolean {
  if (error === null || error === undefined) return false
  const err = error as { code?: string; message?: string; cause?: unknown }
  if (typeof err.code === 'string' && PRISMA_CONNECTION_CODES.includes(err.code as (typeof PRISMA_CONNECTION_CODES)[number])) {
    return true
  }
  const message = typeof err.message === 'string' ? err.message : ''
  if (CONNECTION_ERROR_MESSAGES.some((msg) => message.includes(msg))) return true
  // Better Auth peut envelopper l'erreur Prisma dans cause
  if (err.cause && isDatabaseUnreachable(err.cause)) return true
  return false
}

const MIN_LOG_INTERVAL_MS = 60_000
let lastLogTime = 0

/** Log un avertissement au plus une fois par minute pour éviter le spam. */
export function logDatabaseUnreachableOnce(customMessage?: string): void {
  const now = Date.now()
  if (now - lastLogTime < MIN_LOG_INTERVAL_MS) return
  lastLogTime = now
  const message =
    customMessage ??
    'Database unreachable (e.g. Neon paused or network). Session treated as unauthenticated.'
  console.warn(`[Resonance] ${message}`)
}
