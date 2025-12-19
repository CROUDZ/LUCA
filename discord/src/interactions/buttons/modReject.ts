import {
  ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from 'discord.js';
import { ButtonHandler } from '../../types/index.js';

/**
 * Handler pour le bouton de refus de mod
 */
const handler: ButtonHandler = {
  // Match les custom_id qui commencent par "mod_reject_"
  customId: /^mod_reject_/,

  execute: async (interaction: ButtonInteraction) => {
    // Extraire l'ID du mod du custom_id
    const modId = interaction.customId.replace('mod_reject_', '');

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

    // Afficher un modal pour demander la raison du refus
    const modal = new ModalBuilder()
      .setCustomId(`mod_reject_modal_${modId}`)
      .setTitle('Refuser le mod');

    const reasonInput = new TextInputBuilder()
      .setCustomId('rejection_reason')
      .setLabel('Raison du refus')
      .setPlaceholder('Expliquez pourquoi ce mod est refusé...')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(500);

    const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput);
    modal.addComponents(actionRow);

    await interaction.showModal(modal);
  },
};

export default handler;
