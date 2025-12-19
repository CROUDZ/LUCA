import { Client, Interaction } from 'discord.js';
import { Event } from '../types/index.js';
import { handleButton, handleSelectMenu, handleModal } from '../handlers/interactionHandler.js';

const event: Event<'interactionCreate'> = {
  name: 'interactionCreate',
  once: false,
  execute: async (client: Client, interaction: Interaction) => {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) {
        console.error(`❌ Command ${interaction.commandName} not found`);
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`❌ Error executing command ${interaction.commandName}:`, error);

        const errorMessage = {
          content: '❌ An error occurred while executing this command.',
          ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      }
    }

    // Handle button interactions
    else if (interaction.isButton()) {
      try {
        await handleButton(interaction);
      } catch (error) {
        console.error('❌ Error handling button:', error);
      }
    }

    // Handle select menu interactions
    else if (interaction.isStringSelectMenu()) {
      try {
        await handleSelectMenu(interaction);
      } catch (error) {
        console.error('❌ Error handling select menu:', error);
      }
    }

    // Handle modal submissions
    else if (interaction.isModalSubmit()) {
      try {
        await handleModal(interaction);
      } catch (error) {
        console.error('❌ Error handling modal:', error);
      }
    }

    // Handle autocomplete
    else if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);

      if (!command) return;

      // Add autocomplete handling if needed
    }
  },
};

export default event;
