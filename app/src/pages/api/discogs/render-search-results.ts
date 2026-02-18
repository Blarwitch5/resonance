import type { APIRoute } from 'astro'
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import SearchResultsGrid from '../../../components/explorer/SearchResultsGrid.astro'

export const POST: APIRoute = async ({ request }) => {
  try {
    const { results } = await request.json()

    if (!results || !Array.isArray(results)) {
      return new Response(JSON.stringify({ error: 'Invalid results format' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Créer un container Astro et rendre le composant en HTML
    const container = await AstroContainer.create()
    const html = await container.renderToString(SearchResultsGrid, {
      props: { results },
    })

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' },
    })
  } catch (error) {
    console.error('Error rendering search results:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
