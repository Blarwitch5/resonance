import type { Locale } from './config'

const messages = {
  en: {
    meta: {
      title: 'My Library - Resonance',
      description: 'Browse and manage your music collection across formats.',
    },
    header: {
      title: 'My Library',
      albumsCount: {
        one: '{count} album',
        other: '{count} albums',
      },
      collectionsCount: {
        one: '{count} collection',
        other: '{count} collections',
      },
    },
    formats: {
      all: 'All formats',
      uncategorized: 'Uncategorized',
      vinyl: 'Vinyl',
      cassette: 'Cassette',
      cd: 'CD',
    },
    emptyState: {
      allTitle: 'Start your music collection',
      allDescription:
        'Explore millions of albums on Discogs and start building your personalized collection. Every vinyl, CD, or cassette tells a story.',
      formatTitle: 'Start your {format} collection',
      formatDescription:
        'Discover beautiful {formatPlural} and start your collection. Explore Discogs to find your favorite albums.',
      addAlbum: 'Add an album',
      scanBarcode: 'Scan a barcode',
      comingSoonBarcode: 'Barcode scanning coming soon',
    },
    collections: {
      uncategorized: 'Uncategorized',
      noUncategorized: 'No uncategorized albums',
      empty: 'This collection is empty',
      noUncategorizedHint: 'Albums you add without selecting a collection will appear here.',
      emptyHint: 'Start adding albums to this collection to fill it.',
      viewCollection: 'View collection',
    },
    collectionSearch: {
      label: 'Search your collection (title, artist, genre)',
      placeholder: 'Search by title, artist, genre...',
      clearAria: 'Clear search',
      noResults: 'No results',
      noResultsForQuery: 'No album matches "{query}"',
    },
    sortFilter: {
      title: 'Filters and sort',
      description: 'Organize your collection',
      clearAll: 'Clear',
      clearAllTitle: 'Clear all filters',
      sortBy: 'Sort by',
      sortAddedAtDesc: 'Recently added',
      sortAddedAtAsc: 'Oldest first',
      sortTitleAsc: 'Title A-Z',
      sortTitleDesc: 'Title Z-A',
      sortArtistAsc: 'Artist A-Z',
      sortArtistDesc: 'Artist Z-A',
      sortYearDesc: 'Newest year',
      sortYearAsc: 'Oldest year',
      genre: 'Genre',
      allGenres: 'All genres',
      year: 'Year',
      allYears: 'All years',
      collection: 'Collection',
      filterByCollectionAria: 'Filter by collection',
      filterButton: 'Filter',
      allCollections: 'All collections',
      uncategorized: 'Uncategorized',
      collectionFallback: 'Collection',
      favoritesOnly: 'Favorites only',
      favoritesOnlyDescription: 'Show only your favorites',
    },
  },
  fr: {
    meta: {
      title: 'Ma bibliothèque - Resonance',
      description: 'Parcourez et gérez votre collection musicale tous formats confondus.',
    },
    header: {
      title: 'Ma bibliothèque',
      albumsCount: {
        one: '{count} album',
        other: '{count} albums',
      },
      collectionsCount: {
        one: '{count} collection',
        other: '{count} collections',
      },
    },
    formats: {
      all: 'Tous les formats',
      uncategorized: 'Non classés',
      vinyl: 'Vinyle',
      cassette: 'Cassette',
      cd: 'CD',
    },
    emptyState: {
      allTitle: 'Commence ta collection musicale',
      allDescription:
        'Explore des millions d’albums sur Discogs et commence à construire ta collection personnalisée. Chaque vinyle, CD ou cassette raconte une histoire.',
      formatTitle: 'Commence ta collection de {format}',
      formatDescription:
        'Découvre de superbes {formatPlural} et commence ta collection. Explore Discogs pour trouver tes albums préférés.',
      addAlbum: 'Ajouter un album',
      scanBarcode: 'Scanner un code-barres',
      comingSoonBarcode: 'Scan par code-barres bientôt disponible',
    },
    collections: {
      uncategorized: 'Non classés',
      noUncategorized: 'Aucun album non classé',
      empty: 'Cette collection est vide',
      noUncategorizedHint:
        'Les albums que tu ajoutes sans sélectionner de collection apparaîtront ici.',
      emptyHint: 'Commence à ajouter des albums à cette collection pour la remplir.',
      viewCollection: 'Voir la collection',
    },
    collectionSearch: {
      label: 'Rechercher dans ta collection (titre, artiste, genre)',
      placeholder: 'Recherche par titre, artiste, genre...',
      clearAria: 'Effacer la recherche',
      noResults: 'Aucun résultat',
      noResultsForQuery: 'Aucun album ne correspond à « {query} »',
    },
    sortFilter: {
      title: 'Filtres et tri',
      description: 'Organisez votre collection',
      clearAll: 'Effacer',
      clearAllTitle: 'Effacer tous les filtres',
      sortBy: 'Trier par',
      sortAddedAtDesc: 'Récents en premier',
      sortAddedAtAsc: 'Anciens en premier',
      sortTitleAsc: 'Titre A-Z',
      sortTitleDesc: 'Titre Z-A',
      sortArtistAsc: 'Artiste A-Z',
      sortArtistDesc: 'Artiste Z-A',
      sortYearDesc: 'Année récente',
      sortYearAsc: 'Année ancienne',
      genre: 'Genre',
      allGenres: 'Tous les genres',
      year: 'Année',
      allYears: 'Toutes les années',
      collection: 'Collection',
      filterByCollectionAria: 'Filtrer par collection',
      filterButton: 'Filtrer',
      allCollections: 'Toutes les collections',
      uncategorized: 'Non classés',
      collectionFallback: 'Collection',
      favoritesOnly: 'Favoris uniquement',
      favoritesOnlyDescription: 'Afficher uniquement vos favoris',
    },
  },
} satisfies Record<Locale, unknown>

export type LibraryMessages = (typeof messages)['en']

export function getLibraryMessages(locale: Locale): LibraryMessages {
  return messages[locale] as LibraryMessages
}

