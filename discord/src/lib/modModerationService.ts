import {
  Client,
  TextChannel,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';

export interface ModSubmissionData {
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
 * Service pour envoyer des notifications de modération dans Discord
 */
export class ModModerationService {
  private client: Client;
  private channelId: string;

  constructor(client: Client) {
    this.client = client;
    this.channelId = process.env.MOD_MODERATION_CHANNEL_ID || '';
  }

  /**
   * Envoie une notification pour un nouveau mod en attente de vérification
   */
  async sendModSubmissionNotification(mod: ModSubmissionData): Promise<boolean> {
    if (!this.channelId) {
      console.error('❌ MOD_MODERATION_CHANNEL_ID not configured');
      return false;
    }

    try {
      const channel = await this.client.channels.fetch(this.channelId);
      
      if (!channel || !(channel instanceof TextChannel)) {
        console.error('❌ Invalid moderation channel');
        return false;
      }

      const webBaseUrl = process.env.WEB_API_URL || 'http://localhost:3000';
      const codeViewUrl = `${webBaseUrl}/mods/${mod.modName}/code`;

      // Tronquer le code pour l'aperçu
      let codePreview = mod.mainCode.substring(0, 800);
      if (mod.mainCode.length > 800) {
        codePreview += '\n... (code tronqué)';
      }
      // Échapper les backticks pour éviter de casser le formatage
      codePreview = codePreview.replace(/```/g, '`\u200B`\u200B`');

      // Créer l'embed
      const embed = new EmbedBuilder()
        .setTitle(`🆕 Nouveau Mod: ${mod.displayName}`)
        .setDescription(mod.description.substring(0, 2000))
        .setColor(0xFFA500) // Orange
        .addFields(
          { name: '📦 Nom technique', value: `\`${mod.modName}\``, inline: true },
          { name: '📌 Version', value: mod.version || '1.0.0', inline: true },
          { name: '📁 Catégorie', value: mod.category || 'Other', inline: true },
          { name: '👤 Auteur', value: mod.authorName || 'Anonyme', inline: true },
          { name: '🔗 Voir le code', value: `[Ouvrir dans le navigateur](${codeViewUrl})`, inline: false },
        )
        .setTimestamp()
        .setFooter({ text: `ID: ${mod.modId}` });

      // Ajouter l'aperçu du code si pas trop long
      if (codePreview.length < 900) {
        embed.addFields({
          name: '📝 Aperçu du code',
          value: `\`\`\`js\n${codePreview}\n\`\`\``,
          inline: false,
        });
      }

      // Créer les boutons
      const row = new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`mod_approve_${mod.modId}`)
            .setLabel('✅ Approuver')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(`mod_reject_${mod.modId}`)
            .setLabel('❌ Refuser')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setLabel('👁️ Voir le code')
            .setStyle(ButtonStyle.Link)
            .setURL(codeViewUrl),
        );

      // Envoyer le message
      await channel.send({
        content: '📋 **Nouveau mod en attente de vérification**',
        embeds: [embed],
        components: [row],
      });

      console.log(`✅ Discord notification sent for mod: ${mod.displayName}`);
      return true;

    } catch (error) {
      console.error('❌ Failed to send Discord notification:', error);
      return false;
    }
  }

  /**
   * Met à jour un message de mod pour indiquer qu'il a été approuvé
   */
  async updateModApproved(modId: string, moderatorId: string): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(this.channelId);
      if (!channel || !(channel instanceof TextChannel)) return;

      const messages = await channel.messages.fetch({ limit: 50 });
      const message = messages.find(msg =>
        msg.embeds.some(embed => embed.footer?.text?.includes(modId))
      );

      if (message && message.embeds[0]) {
        const updatedEmbed = EmbedBuilder.from(message.embeds[0])
          .setColor(0x00FF00)
          .setTitle(`✅ APPROUVÉ: ${message.embeds[0].title?.replace('🆕 Nouveau Mod: ', '') || 'Mod'}`)
          .addFields(
            { name: '✅ Approuvé par', value: `<@${moderatorId}>`, inline: true },
            { name: '📅 Date', value: new Date().toLocaleString('fr-FR'), inline: true },
          );

        await message.edit({
          content: '✅ **Mod approuvé**',
          embeds: [updatedEmbed],
          components: [],
        });
      }
    } catch (error) {
      console.error('Failed to update mod message:', error);
    }
  }

  /**
   * Met à jour un message de mod pour indiquer qu'il a été refusé
   */
  async updateModRejected(modId: string, moderatorId: string, reason: string): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(this.channelId);
      if (!channel || !(channel instanceof TextChannel)) return;

      const messages = await channel.messages.fetch({ limit: 50 });
      const message = messages.find(msg =>
        msg.embeds.some(embed => embed.footer?.text?.includes(modId))
      );

      if (message && message.embeds[0]) {
        const updatedEmbed = EmbedBuilder.from(message.embeds[0])
          .setColor(0xFF0000)
          .setTitle(`❌ REFUSÉ: ${message.embeds[0].title?.replace('🆕 Nouveau Mod: ', '') || 'Mod'}`)
          .addFields(
            { name: '❌ Refusé par', value: `<@${moderatorId}>`, inline: true },
            { name: '📅 Date', value: new Date().toLocaleString('fr-FR'), inline: true },
            { name: '📝 Raison', value: reason, inline: false },
          );

        await message.edit({
          content: '❌ **Mod refusé et supprimé**',
          embeds: [updatedEmbed],
          components: [],
        });
      }
    } catch (error) {
      console.error('Failed to update mod message:', error);
    }
  }
}

// Instance globale du service
let moderationService: ModModerationService | null = null;

export function initModModerationService(client: Client): ModModerationService {
  moderationService = new ModModerationService(client);
  return moderationService;
}

export function getModModerationService(): ModModerationService | null {
  return moderationService;
}
