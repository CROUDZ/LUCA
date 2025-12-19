import { ButtonInteraction, StringSelectMenuInteraction, ModalSubmitInteraction } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ButtonHandler, SelectMenuHandler, ModalHandler } from '../types/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Store handlers
const buttonHandlers: ButtonHandler[] = [];
const selectMenuHandlers: SelectMenuHandler[] = [];
const modalHandlers: ModalHandler[] = [];

export async function loadInteractionHandlers(): Promise<void> {
  const interactionsPath = join(__dirname, '..', 'interactions');

  try {
    // Load button handlers
    const buttonsPath = join(interactionsPath, 'buttons');
    if (readdirSync(interactionsPath).includes('buttons')) {
      const buttonFiles = readdirSync(buttonsPath).filter(
        (file) => file.endsWith('.ts') || file.endsWith('.js')
      );

      for (const file of buttonFiles) {
        const handler = (await import(join(buttonsPath, file))) as { default: ButtonHandler };
        if (handler.default) {
          buttonHandlers.push(handler.default);
          console.log(`✅ Loaded button handler: ${handler.default.customId}`);
        }
      }
    }

    // Load select menu handlers
    const selectsPath = join(interactionsPath, 'selects');
    if (readdirSync(interactionsPath).includes('selects')) {
      const selectFiles = readdirSync(selectsPath).filter(
        (file) => file.endsWith('.ts') || file.endsWith('.js')
      );

      for (const file of selectFiles) {
        const handler = (await import(join(selectsPath, file))) as { default: SelectMenuHandler };
        if (handler.default) {
          selectMenuHandlers.push(handler.default);
          console.log(`✅ Loaded select menu handler: ${handler.default.customId}`);
        }
      }
    }

    // Load modal handlers
    const modalsPath = join(interactionsPath, 'modals');
    if (readdirSync(interactionsPath).includes('modals')) {
      const modalFiles = readdirSync(modalsPath).filter(
        (file) => file.endsWith('.ts') || file.endsWith('.js')
      );

      for (const file of modalFiles) {
        const handler = (await import(join(modalsPath, file))) as { default: ModalHandler };
        if (handler.default) {
          modalHandlers.push(handler.default);
          console.log(`✅ Loaded modal handler: ${handler.default.customId}`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error loading interaction handlers:', error);
  }
}

export async function handleButton(interaction: ButtonInteraction): Promise<void> {
  const handler = buttonHandlers.find((h) => {
    if (typeof h.customId === 'string') {
      return h.customId === interaction.customId;
    }
    return h.customId.test(interaction.customId);
  });

  if (handler) {
    await handler.execute(interaction);
  }
}

export async function handleSelectMenu(interaction: StringSelectMenuInteraction): Promise<void> {
  const handler = selectMenuHandlers.find((h) => {
    if (typeof h.customId === 'string') {
      return h.customId === interaction.customId;
    }
    return h.customId.test(interaction.customId);
  });

  if (handler) {
    await handler.execute(interaction);
  }
}

export async function handleModal(interaction: ModalSubmitInteraction): Promise<void> {
  const handler = modalHandlers.find((h) => {
    if (typeof h.customId === 'string') {
      return h.customId === interaction.customId;
    }
    return h.customId.test(interaction.customId);
  });

  if (handler) {
    await handler.execute(interaction);
  }
}
