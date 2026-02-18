/**
 * Génération et parsing de slugs pour les URLs items et explorer.
 * Format items: artist-annee-titre-id4chiffres (id unique 4 chiffres en fin).
 * Format explorer: artist-annee-titre-discogsId (discogsId en dernier pour résolution).
 */

const ACCENT_MAP: Record<string, string> = {
  'à': 'a', 'á': 'a', 'â': 'a', 'ã': 'a', 'ä': 'a', 'å': 'a',
  'è': 'e', 'é': 'e', 'ê': 'e', 'ë': 'e',
  'ì': 'i', 'í': 'i', 'î': 'i', 'ï': 'i',
  'ò': 'o', 'ó': 'o', 'ô': 'o', 'õ': 'o', 'ö': 'o',
  'ù': 'u', 'ú': 'u', 'û': 'u', 'ü': 'u',
  'ñ': 'n', 'ç': 'c', 'ß': 'ss', 'œ': 'oe', 'æ': 'ae',
}

function normalizeForSlug(text: string): string {
  return text
    .toLowerCase()
    .split('')
    .map((char) => ACCENT_MAP[char] ?? char)
    .join('')
}

/**
 * Transforme un texte en slug URL-safe : minuscules, sans accents, alphanumeric + tirets.
 */
export function slugify(text: string): string {
  if (!text || typeof text !== 'string') return ''
  const normalized = normalizeForSlug(text.trim())
  return normalized
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Partie commune du slug : artist-annee-titre (sans id).
 * Ordre : artiste, année, titre de l'album.
 */
export function buildItemSlugBase(artist: string, title: string, year: number | null): string {
  const parts = [slugify(artist)]
  if (year != null && Number.isFinite(year)) {
    parts.push(String(year))
  }
  parts.push(slugify(title))
  return parts.filter(Boolean).join('-') || 'album'
}

/**
 * Slug pour un item (bibliothèque) : artist-annee-titre-XXXX (id unique 4 chiffres).
 * Utilisé pour /items/[slug]. Le service ajoute l'id 4 chiffres pour l'unicité.
 */
export function buildItemSlug(
  artist: string,
  title: string,
  year: number | null,
  unique4Digits: string
): string {
  const base = buildItemSlugBase(artist, title, year)
  return `${base}-${unique4Digits}`
}

/**
 * Génère un id unique 4 chiffres (1000–9999) pour le slug.
 */
export function generateUnique4DigitId(): string {
  const randomNumber = Math.floor(1000 + Math.random() * 9000)
  return String(randomNumber)
}

/**
 * Slug pour l'explorer : artist-annee-titre-discogsId.
 * Le discogsId en dernier permet de parser l'URL sans ambiguïté.
 */
export function buildExplorerSlug(
  artist: string,
  title: string,
  year: number | null | undefined,
  discogsId: number
): string {
  const base = buildItemSlugBase(artist, title, year ?? null)
  return `${base}-${discogsId}`
}

/**
 * Extrait le discogsId depuis un slug explorer ou un segment numérique.
 * - "daft-punk-random-access-memories-2013-12345" → 12345
 * - "12345" → 12345
 */
export function parseExplorerSlug(slug: string): number | null {
  if (!slug || typeof slug !== 'string') return null
  const trimmed = slug.trim()
  if (/^\d+$/.test(trimmed)) {
    return Number.parseInt(trimmed, 10)
  }
  const lastHyphenIndex = trimmed.lastIndexOf('-')
  if (lastHyphenIndex === -1) return null
  const lastSegment = trimmed.slice(lastHyphenIndex + 1)
  if (!/^\d+$/.test(lastSegment)) return null
  return Number.parseInt(lastSegment, 10)
}

/** CUID fait environ 25 caractères, commence souvent par "c". */
const CUID_LIKE = /^[cC][a-z0-9]{20,}$/

export function looksLikeItemId(param: string): boolean {
  return param.length >= 20 && CUID_LIKE.test(param)
}
