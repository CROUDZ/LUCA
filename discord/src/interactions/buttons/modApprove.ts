import { ButtonInteraction, EmbedBuilder } from 'discord.js';
import { ButtonHandler } from '../../types/index.js';

/**
 * Handler pour le bouton d'approbation de mod
 */
const handler: ButtonHandler = {
  // Match les custom_id qui commencent par "mod_approve_"
  customId: /^mod_approve_/,

  execute: async (interaction: ButtonInteraction) => {
    // Extraire l'ID du mod du custom_id
    const modId = interaction.customId.replace('mod_approve_', '');

    // Vérifier si l'utilisateur a le rôle de modérateur
    const hasModeratorRole =
      interaction.memberPermissions?.has('ManageMessages') ||
      interaction.memberPermissions?.has('Administrator');

    if (!hasModeratorRole) {
      await interaction.reply({
        content: "❌ Vous n'avez pas la permission de modérer les mods.",
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    try {
      // Appeler l'API de modération du serveur web
      const apiUrl = process.env.WEB_API_URL || 'http://localhost:3000';
      const moderationSecret = process.env.MOD_MODERATION_SECRET;

      if (!moderationSecret) {
        await interaction.editReply({
          content: '❌ Configuration manquante: MOD_MODERATION_SECRET',
        });
        return;
      }

      const response = await fetch(`${apiUrl}/api/mods/moderate/${modId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'approve',
          secret: moderationSecret,
        }),
      });

      const result = (await response.json()) as { error?: string; message?: string };

      if (!response.ok) {
        await interaction.editReply({
          content: `❌ Erreur: ${result.error || "Échec de l'approbation"}`,
        });
        return;
      }

      // Mettre à jour le message original pour montrer que c'est traité
      const originalEmbed = interaction.message.embeds[0];
      if (originalEmbed) {
        const updatedEmbed = EmbedBuilder.from(originalEmbed)
          .setColor(0x00ff00)
          .setTitle(`✅ APPROUVÉ: ${originalEmbed.title?.replace('🆕 Nouveau Mod: ', '') || 'Mod'}`)
          .addFields(
            { name: '✅ Approuvé par', value: `<@${interaction.user.id}>`, inline: true },
            { name: '📅 Date', value: new Date().toLocaleString('fr-FR'), inline: true }
          );

        await interaction.message.edit({
          content: '✅ **Mod approuvé**',
          embeds: [updatedEmbed],
          components: [], // Retirer les boutons
        });
      }

      await interaction.editReply({
        content: `✅ Le mod a été approuvé avec succès !`,
      });
    } catch (error) {
      console.error('Error approving mod:', error);
      await interaction.editReply({
        content: "❌ Une erreur est survenue lors de l'approbation du mod.",
      });
    }
  },
};

export default handler;
