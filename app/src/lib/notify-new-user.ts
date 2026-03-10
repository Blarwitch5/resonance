/**
 * Notifie (webhook) quand un nouvel utilisateur s'inscrit.
 * Variable d'environnement : NEW_USER_WEBHOOK_URL
 * - Discord : https://discord.com/api/webhooks/ID/TOKEN
 * - Slack : URL "Incoming Webhook" du canal
 * - Autre : toute URL acceptant un POST JSON
 */
type NewUserPayload = {
  email: string
  name: string | null
  createdAt: string
}

function getWebhookUrl(): string | undefined {
  return import.meta.env.NEW_USER_WEBHOOK_URL
}

/**
 * Envoie une notification à la webhook configurée.
 * Ne lance pas d'erreur si la webhook n'est pas configurée ou si l'envoi échoue.
 */
export async function notifyNewUser(payload: NewUserPayload): Promise<void> {
  const url = getWebhookUrl()
  if (!url) return

  try {
    // Discord attend { content } ou { embeds }; Slack et autres acceptent du JSON libre
    const isDiscord = url.includes('discord.com/api/webhooks')
    const body = isDiscord
      ? {
          content: `🆕 **Nouvel inscrit sur Resonance**\n**Email:** ${payload.email}\n**Nom:** ${payload.name ?? '—'}\n*${payload.createdAt}*`,
        }
      : {
          event: 'user.registered',
          app: 'Resonance',
          ...payload,
        }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      console.warn('[notifyNewUser] Webhook returned', response.status, await response.text())
    }
  } catch (error) {
    console.warn('[notifyNewUser] Failed to send:', error)
  }
}
