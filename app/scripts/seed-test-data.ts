/**
 * Script pour ajouter des données fictives dans la base de données
 * Utile pour tester les graphiques et les fonctionnalités
 * 
 * Usage: pnpm tsx scripts/seed-test-data.ts
 */

import { db } from '../src/lib/db'
import type { Format } from '@prisma/client'

// Données fictives d'albums avec différents formats, genres et années
const mockAlbums = [
  // Vinyl - Rock
  { title: 'Abbey Road', artist: 'The Beatles', year: 1969, genre: 'Rock', format: 'VINYL' as Format, discogsId: 1001 },
  { title: 'Dark Side of the Moon', artist: 'Pink Floyd', year: 1973, genre: 'Rock', format: 'VINYL' as Format, discogsId: 1002 },
  { title: 'Led Zeppelin IV', artist: 'Led Zeppelin', year: 1971, genre: 'Rock', format: 'VINYL' as Format, discogsId: 1003 },
  { title: 'The Wall', artist: 'Pink Floyd', year: 1979, genre: 'Rock', format: 'VINYL' as Format, discogsId: 1004 },
  { title: 'Hotel California', artist: 'Eagles', year: 1976, genre: 'Rock', format: 'VINYL' as Format, discogsId: 1005 },
  { title: 'Rumours', artist: 'Fleetwood Mac', year: 1977, genre: 'Rock', format: 'VINYL' as Format, discogsId: 1006 },
  { title: 'Back in Black', artist: 'AC/DC', year: 1980, genre: 'Rock', format: 'VINYL' as Format, discogsId: 1007 },
  { title: 'Thriller', artist: 'Michael Jackson', year: 1982, genre: 'Pop', format: 'VINYL' as Format, discogsId: 1008 },
  { title: 'Nevermind', artist: 'Nirvana', year: 1991, genre: 'Rock', format: 'VINYL' as Format, discogsId: 1009 },
  { title: 'OK Computer', artist: 'Radiohead', year: 1997, genre: 'Rock', format: 'VINYL' as Format, discogsId: 1010 },
  
  // CD - Pop
  { title: '21', artist: 'Adele', year: 2011, genre: 'Pop', format: 'CD' as Format, discogsId: 2001 },
  { title: '25', artist: 'Adele', year: 2015, genre: 'Pop', format: 'CD' as Format, discogsId: 2002 },
  { title: '1989', artist: 'Taylor Swift', year: 2014, genre: 'Pop', format: 'CD' as Format, discogsId: 2003 },
  { title: 'Random Access Memories', artist: 'Daft Punk', year: 2013, genre: 'Electronic', format: 'CD' as Format, discogsId: 2004 },
  { title: 'In Rainbows', artist: 'Radiohead', year: 2007, genre: 'Rock', format: 'CD' as Format, discogsId: 2005 },
  { title: 'Currents', artist: 'Tame Impala', year: 2015, genre: 'Electronic', format: 'CD' as Format, discogsId: 2006 },
  { title: 'Blonde', artist: 'Frank Ocean', year: 2016, genre: 'Hip Hop', format: 'CD' as Format, discogsId: 2007 },
  { title: 'To Pimp a Butterfly', artist: 'Kendrick Lamar', year: 2015, genre: 'Hip Hop', format: 'CD' as Format, discogsId: 2008 },
  { title: 'The Suburbs', artist: 'Arcade Fire', year: 2010, genre: 'Rock', format: 'CD' as Format, discogsId: 2009 },
  { title: 'AM', artist: 'Arctic Monkeys', year: 2013, genre: 'Rock', format: 'CD' as Format, discogsId: 2010 },
  
  // CD - Jazz
  { title: 'Kind of Blue', artist: 'Miles Davis', year: 1959, genre: 'Jazz', format: 'CD' as Format, discogsId: 3001 },
  { title: 'A Love Supreme', artist: 'John Coltrane', year: 1965, genre: 'Jazz', format: 'CD' as Format, discogsId: 3002 },
  { title: 'Time Out', artist: 'Dave Brubeck', year: 1959, genre: 'Jazz', format: 'CD' as Format, discogsId: 3003 },
  { title: 'Blue Train', artist: 'John Coltrane', year: 1957, genre: 'Jazz', format: 'CD' as Format, discogsId: 3004 },
  { title: 'The Shape of Jazz to Come', artist: 'Ornette Coleman', year: 1959, genre: 'Jazz', format: 'CD' as Format, discogsId: 3005 },
  
  // Cassette - Hip Hop
  { title: 'Illmatic', artist: 'Nas', year: 1994, genre: 'Hip Hop', format: 'CASSETTE' as Format, discogsId: 4001 },
  { title: 'The Chronic', artist: 'Dr. Dre', year: 1992, genre: 'Hip Hop', format: 'CASSETTE' as Format, discogsId: 4002 },
  { title: 'Enter the Wu-Tang', artist: 'Wu-Tang Clan', year: 1993, genre: 'Hip Hop', format: 'CASSETTE' as Format, discogsId: 4003 },
  { title: 'Ready to Die', artist: 'The Notorious B.I.G.', year: 1994, genre: 'Hip Hop', format: 'CASSETTE' as Format, discogsId: 4004 },
  { title: 'The Low End Theory', artist: 'A Tribe Called Quest', year: 1991, genre: 'Hip Hop', format: 'CASSETTE' as Format, discogsId: 4005 },
  
  // Cassette - Electronic
  { title: 'Selected Ambient Works 85-92', artist: 'Aphex Twin', year: 1992, genre: 'Electronic', format: 'CASSETTE' as Format, discogsId: 5001 },
  { title: 'Music Has the Right to Children', artist: 'Boards of Canada', year: 1998, genre: 'Electronic', format: 'CASSETTE' as Format, discogsId: 5002 },
  { title: 'Geogaddi', artist: 'Boards of Canada', year: 2002, genre: 'Electronic', format: 'CASSETTE' as Format, discogsId: 5003 },
  
  // Vinyl - Jazz
  { title: 'Bitches Brew', artist: 'Miles Davis', year: 1970, genre: 'Jazz', format: 'VINYL' as Format, discogsId: 6001 },
  { title: 'Giant Steps', artist: 'John Coltrane', year: 1960, genre: 'Jazz', format: 'VINYL' as Format, discogsId: 6002 },
  
  // CD - Classical
  { title: 'The Four Seasons', artist: 'Antonio Vivaldi', year: 1725, genre: 'Classical', format: 'CD' as Format, discogsId: 7001 },
  { title: 'Symphony No. 9', artist: 'Ludwig van Beethoven', year: 1824, genre: 'Classical', format: 'CD' as Format, discogsId: 7002 },
  
  // Vinyl - Pop (années 80)
  { title: 'Purple Rain', artist: 'Prince', year: 1984, genre: 'Pop', format: 'VINYL' as Format, discogsId: 8001 },
  { title: 'Like a Virgin', artist: 'Madonna', year: 1984, genre: 'Pop', format: 'VINYL' as Format, discogsId: 8002 },
  { title: 'Born in the U.S.A.', artist: 'Bruce Springsteen', year: 1984, genre: 'Rock', format: 'VINYL' as Format, discogsId: 8003 },
  
  // CD - Rock (années 2000)
  { title: 'Is This It', artist: 'The Strokes', year: 2001, genre: 'Rock', format: 'CD' as Format, discogsId: 9001 },
  { title: 'Elephant', artist: 'The White Stripes', year: 2003, genre: 'Rock', format: 'CD' as Format, discogsId: 9002 },
  { title: 'Funeral', artist: 'Arcade Fire', year: 2004, genre: 'Rock', format: 'CD' as Format, discogsId: 9003 },
]

async function seedTestData() {
  try {
    console.log('🌱 Starting to seed test data...')

    // Récupérer le premier utilisateur (ou créer un utilisateur de test)
    let user = await db.user.findFirst()
    
    if (!user) {
      console.log('⚠️  No user found. Please create a user first by signing up.')
      process.exit(1)
    }

    console.log(`✅ Found user: ${user.email} (${user.id})`)

    // Créer quelques collections
    const collections = [
      { name: 'My Favorites', slug: 'my-favorites', description: 'My favorite albums' },
      { name: 'Classic Rock', slug: 'classic-rock', description: 'Classic rock collection' },
      { name: 'Jazz Collection', slug: 'jazz-collection', description: 'Jazz albums' },
    ]

    const createdCollections = []
    for (const collectionData of collections) {
      const existing = await db.collection.findUnique({
        where: { userId_slug: { userId: user.id, slug: collectionData.slug } },
      })
      
      if (!existing) {
        const collection = await db.collection.create({
          data: {
            ...collectionData,
            userId: user.id,
          },
        })
        createdCollections.push(collection)
        console.log(`✅ Created collection: ${collection.name}`)
      } else {
        createdCollections.push(existing)
        console.log(`ℹ️  Collection already exists: ${collectionData.name}`)
      }
    }

    // Ajouter des items
    let createdCount = 0
    let skippedCount = 0

    for (const album of mockAlbums) {
      // Vérifier si l'item existe déjà
      const existing = await db.item.findFirst({
        where: {
          discogsId: album.discogsId,
          userId: user.id,
        },
      })

      if (existing) {
        skippedCount++
        continue
      }

      // Assigner aléatoirement une collection ou laisser null
      const collection = createdCollections[Math.floor(Math.random() * createdCollections.length)]

      // Créer l'item
      const item = await db.item.create({
        data: {
          discogsId: album.discogsId,
          title: album.title,
          artist: album.artist,
          year: album.year,
          genre: album.genre,
          format: album.format,
          userId: user.id,
          collectionId: Math.random() > 0.3 ? collection.id : null, // 70% dans une collection
          country: 'US',
          label: 'Various Labels',
        },
      })

      // Ajouter des métadonnées pour certains items
      if (Math.random() > 0.5) {
        await db.itemMetadata.create({
          data: {
            itemId: item.id,
            isFavorite: Math.random() > 0.7,
            isListened: Math.random() > 0.3,
            personalRating: Math.random() > 0.5 ? Math.round((Math.random() * 4 + 1) * 10) / 10 : null,
            condition: ['Mint', 'Near Mint', 'Very Good', 'Good'][Math.floor(Math.random() * 4)],
          },
        })
      }

      createdCount++
    }

    console.log(`\n✅ Seeding complete!`)
    console.log(`   - Created: ${createdCount} items`)
    console.log(`   - Skipped: ${skippedCount} items (already exist)`)
    console.log(`   - Collections: ${createdCollections.length}`)
    console.log(`\n🎉 Test data ready! You can now test the charts.`)

  } catch (error) {
    console.error('❌ Error seeding test data:', error)
    process.exit(1)
  } finally {
    await db.$disconnect()
  }
}

// Exécuter le script
seedTestData()
