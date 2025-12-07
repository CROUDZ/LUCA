/**
 * Discord Bot API Service
 * Envoie des notifications Discord via le bot Discord (avec boutons interactifs)
 */

interface ModNotificationData {
  modId: string;
  modName: string;
  displayName: string;
  description: string;
  version: string;
  authorName: string;
  category: string;
  mainCode: string;
}

/**
 * Envoie une notification Discord pour un nouveau mod en attente de vérification
 * Utilise l'API du bot Discord pour envoyer un message avec des boutons interactifs
 */
export async function sendModSubmissionNotification(mod: ModNotificationData): Promise<boolean> {
  const discordBotUrl = process.env.DISCORD_BOT_API_URL || 'http://localhost:3001';
  const moderationSecret = process.env.MOD_MODERATION_SECRET;
  
  if (!moderationSecret) {
    console.warn('⚠️ MOD_MODERATION_SECRET not configured - skipping Discord notification');
    return false;
  }

  try {
    const response = await fetch(`${discordBotUrl}/api/mod-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        secret: moderationSecret,
        mod,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('❌ Discord bot API error:', errorData);
      return false;
    }

    console.log(`✅ Discord notification sent for mod: ${mod.displayName}`);
    return true;
  } catch (error) {
    console.error('❌ Failed to send Discord notification:', error);
    // Ne pas bloquer si le bot Discord n'est pas disponible
    return false;
  }
}

/**
 * Ces fonctions ne sont plus nécessaires car le bot Discord
 * met à jour les messages directement via les boutons
 */
export async function sendModApprovedNotification(_mod: { displayName: string; modName: string }): Promise<void> {
  // keep the param referenced to avoid linting issues
  void _mod;
  // Le bot Discord gère la mise à jour du message
}

export async function sendModRejectedNotification(_mod: { displayName: string; modName: string; reason?: string }): Promise<void> {
  void _mod;
  // Le bot Discord gère la mise à jour du message
}
