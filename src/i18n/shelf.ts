import type { Locale } from './config'

const messages = {
  en: {
    title: 'My shelf',
    records: (count: number) => `${count} record${count !== 1 ? 's' : ''}`,
    filterAll: 'All',
    filterAria: 'Filter by format',
    emptyShelf: 'Your shelf is empty. Add your first record!',
    emptyFormat: (format: string) => `No ${format} on your shelf yet.`,
    addFirst: 'Explore Discogs',
    sortRecent: 'Recent',
    sortArtist: 'Artist A–Z',
    sortAria: 'Sort records',
    addRecord: 'Add a record',
  },
  fr: {
    title: 'Ma shelf',
    records: (count: number) => `${count} disque${count !== 1 ? 's' : ''}`,
    filterAll: 'Tout',
    filterAria: 'Filtrer par format',
    emptyShelf: 'Ta shelf est vide. Ajoute ton premier disque !',
    emptyFormat: (format: string) => `Aucun ${format} dans ta shelf.`,
    addFirst: 'Explorer Discogs',
    sortRecent: 'Récents',
    sortArtist: 'Artiste A–Z',
    sortAria: 'Trier les disques',
    addRecord: 'Ajouter un disque',
  },
} satisfies Record<Locale, unknown>

export type ShelfMessages = (typeof messages)['en']

export function getShelfMessages(locale: Locale): ShelfMessages {
  return messages[locale] as ShelfMessages
}
