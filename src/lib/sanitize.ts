/**
 * Strips all HTML from a plain-text user input.
 *
 * These fields (notes, comments, descriptions) are stored as plain text and
 * rendered via Astro's auto-escaping `{}` syntax — never via innerHTML.
 * This function is defense-in-depth: it removes tags, comments, and CDATA
 * before the value reaches the database.
 */
export function stripHtml(input: string): string {
  if (typeof input !== 'string') return ''
  return input
    .replace(/<!--[\s\S]*?-->/g, '')       // HTML comments
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, '') // CDATA sections
    .replace(/<[^>]*>/g, '')               // HTML tags
    .trim()
}
