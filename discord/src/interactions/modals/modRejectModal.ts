import { ModalSubmitInteraction, EmbedBuilder } from 'discord.js';
import { ModalHandler } from '../../types/index.js';

/**
 * Handler pour le modal de refus de mod
 */
const handler: ModalHandler = {
  // Match les custom_id qui commencent par "mod_reject_modal_"
  customId: /^mod_reject_modal_/,
  
  execute: async (interaction: ModalSubmitInteraction) => {
    // Extraire l'ID du mod du custom_id
    const modId = interaction.customId.replace('mod_reject_modal_', '');
    const reason = interaction.fields.getTextInputValue('rejection_reason') || 'Aucune raison fournie';

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
          action: 'reject',
          reason,
          secret: moderationSecret,
        }),
      });

      const result = await response.json() as { error?: string; message?: string };

      if (!response.ok) {
        await interaction.editReply({
          content: `❌ Erreur: ${result.error || 'Échec du refus'}`,
        });
        return;
      }

      // Mettre à jour le message original
      // Le message est celui qui contient le bouton sur lequel on a cliqué
      // On doit le chercher dans le canal
      const channel = interaction.channel;
      if (channel && 'messages' in channel) {
        try {
          const messages = await channel.messages.fetch({ limit: 50 });
          const originalMessage = messages.find(msg => 
            msg.embeds.some(embed => 
              embed.footer?.text?.includes(modId)
            )
          );

          if (originalMessage && originalMessage.embeds[0]) {
            const originalEmbed = originalMessage.embeds[0];
            const updatedEmbed = EmbedBuilder.from(originalEmbed)
              .setColor(0xFF0000)
              .setTitle(`❌ REFUSÉ: ${originalEmbed.title?.replace('🆕 Nouveau Mod: ', '') || 'Mod'}`)
              .addFields(
                { name: '❌ Refusé par', value: `<@${interaction.user.id}>`, inline: true },
                { name: '📅 Date', value: new Date().toLocaleString('fr-FR'), inline: true },
                { name: '📝 Raison', value: reason, inline: false },
              );

            await originalMessage.edit({
              content: '❌ **Mod refusé et supprimé**',
              embeds: [updatedEmbed],
              components: [],
            });
          }
        } catch (editError) {
          console.error('Could not update original message:', editError);
        }
      }

      await interaction.editReply({
        content: `✅ Le mod a été refusé et supprimé.\n**Raison:** ${reason}`,
      });

    } catch (error) {
      console.error('Error rejecting mod:', error);
      await interaction.editReply({
        content: '❌ Une erreur est survenue lors du refus du mod.',
      });
    }
  },
};

export default handler;
