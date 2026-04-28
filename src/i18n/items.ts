export const itemsI18n = {
  fr: {
    nocover: 'Pas de cover',
    ownerSection: 'Ma collection',
    condition: 'État',
    rating: 'Note',
    acquiredAt: 'Acquis le',
    personalNote: 'Note personnelle',
    tracklist: 'Tracklist',
    friendsHaveIt: (n: number) =>
      n === 1 ? '1 personne que tu suis a ce disque' : `${n} personnes que tu suis ont ce disque`,
    communityRating: (avg: string, count: number) =>
      `Moyenne communauté : ${avg}/5 (${count} notes)`,
    addWant: '+ Want',
    inWants: '✓ Dans mes Wants',
    edit: 'Modifier',
    delete: 'Supprimer',
    deleteConfirm: 'Supprimer ce disque de ta shelf ?',
    addToShelf: '+ Ajouter à ma shelf',
    viewInShelf: 'Voir dans ma shelf',
  },
  en: {
    nocover: 'No cover',
    ownerSection: 'My copy',
    condition: 'Condition',
    rating: 'Rating',
    acquiredAt: 'Acquired on',
    personalNote: 'Personal note',
    tracklist: 'Tracklist',
    friendsHaveIt: (n: number) =>
      n === 1 ? '1 person you follow has this record' : `${n} people you follow have this record`,
    communityRating: (avg: string, count: number) =>
      `Community average: ${avg}/5 (${count} ratings)`,
    addWant: '+ Want',
    inWants: '✓ In my Wants',
    edit: 'Edit',
    delete: 'Delete',
    deleteConfirm: 'Remove this record from your shelf?',
    addToShelf: '+ Add to shelf',
    viewInShelf: 'View in my shelf',
  },
} as const
