import type { Locale } from './config'

const messages = {
  en: {
    meta: {
      title: 'Resonance - Where your music resonates',
    },
    tagline: 'Where your music resonates',
    subtitle: 'Manage your multi-format music collection with elegance. Vinyl, CD, Cassette - all in one place, with style.',
    quickNav: {
      library: 'My Library',
      libraryDescription: 'Albums that resonate with you',
      libraryDescriptionGuest: 'Sign in to see your collection',
      libraryAria: 'Go to your library',
      libraryAriaGuest: 'Sign in to access your library',
      explore: 'Explore',
      exploreDescription: 'Discover new albums',
      exploreDescriptionGuest: 'Sign in to discover albums',
      exploreAria: 'Explore the collection',
      exploreAriaGuest: 'Sign in to explore albums',
      profile: 'Profile',
      profileDescription: 'Favorites, wishlist, and statistics',
      profileDescriptionGuest: 'Sign in to see your favorites and statistics',
      profileAria: 'View your profile',
      profileAriaGuest: 'Sign in to view your profile',
    },
    welcome: {
      title: 'Welcome, {name}!',
      subtitle: 'Your collection awaits',
      signOutAria: 'Sign out',
    },
    stats: {
      yourCollection: 'Your Collection',
      vinyl: 'Vinyl',
      cassette: 'Cassette',
      cd: 'CD',
    },
    recentAlbums: 'Recent Albums',
    actions: {
      addAlbum: 'Add Album',
      addAlbumGuest: 'Sign in to add an album',
      addAlbumAria: 'Add an album',
      addAlbumAriaGuest: 'Sign in to add an album',
      viewStatistics: 'View Statistics',
      viewStatisticsGuest: 'Sign in to view your statistics',
      viewStatisticsAria: 'View your statistics',
      viewStatisticsAriaGuest: 'Sign in to view your statistics',
    },
    guest: {
      message: 'Welcome to your musical universe',
      signIn: 'Sign In',
    },
    toasts: {
      welcomeNew: 'Welcome {name}! Your account has been created successfully.',
      welcomeNewNoName: 'Welcome! Your account has been created successfully.',
      welcomeBack: 'Welcome back {name}! You are signed in.',
      welcomeBackNoName: 'Welcome back! You are signed in.',
      signingOut: 'Signing out...',
      signOutError: 'Error while signing out',
    },
  },
  fr: {
    meta: {
      title: 'Resonance - Là où ta musique résonne',
    },
    tagline: 'Là où ta musique résonne',
    subtitle: 'Gère ta collection multi-format avec élégance. Vinyle, CD, Cassette - tout en un seul endroit, avec style.',
    quickNav: {
      library: 'Ma bibliothèque',
      libraryDescription: 'Les albums qui résonnent avec toi',
      libraryDescriptionGuest: 'Connecte-toi pour voir ta collection',
      libraryAria: 'Aller à ma bibliothèque',
      libraryAriaGuest: 'Se connecter pour accéder à ta bibliothèque',
      explore: 'Explorer',
      exploreDescription: 'Découvre de nouveaux albums',
      exploreDescriptionGuest: 'Connecte-toi pour découvrir des albums',
      exploreAria: 'Explorer la collection',
      exploreAriaGuest: 'Se connecter pour explorer les albums',
      profile: 'Profil',
      profileDescription: 'Favoris, liste d’envies et statistiques',
      profileDescriptionGuest: 'Connecte-toi pour voir tes favoris et statistiques',
      profileAria: 'Voir ton profil',
      profileAriaGuest: 'Se connecter pour voir ton profil',
    },
    welcome: {
      title: 'Bienvenue, {name} !',
      subtitle: 'Ta collection t’attend',
      signOutAria: 'Déconnexion',
    },
    stats: {
      yourCollection: 'Ta collection',
      vinyl: 'Vinyle',
      cassette: 'Cassette',
      cd: 'CD',
    },
    recentAlbums: 'Albums récents',
    actions: {
      addAlbum: 'Ajouter un album',
      addAlbumGuest: 'Connecte-toi pour ajouter un album',
      addAlbumAria: 'Ajouter un album',
      addAlbumAriaGuest: 'Se connecter pour ajouter un album',
      viewStatistics: 'Voir les statistiques',
      viewStatisticsGuest: 'Connecte-toi pour voir tes statistiques',
      viewStatisticsAria: 'Voir tes statistiques',
      viewStatisticsAriaGuest: 'Se connecter pour voir tes statistiques',
    },
    guest: {
      message: 'Bienvenue dans ton univers musical',
      signIn: 'Se connecter',
    },
    toasts: {
      welcomeNew: 'Bienvenue {name} ! Ton compte a été créé avec succès.',
      welcomeNewNoName: 'Bienvenue ! Ton compte a été créé avec succès.',
      welcomeBack: 'Bon retour {name} ! Tu es connecté.',
      welcomeBackNoName: 'Bon retour ! Tu es connecté.',
      signingOut: 'Déconnexion...',
      signOutError: 'Erreur lors de la déconnexion',
    },
  },
} satisfies Record<Locale, unknown>

export type HomeMessages = (typeof messages)['en']

export function getHomeMessages(locale: Locale): HomeMessages {
  return messages[locale] as HomeMessages
}
