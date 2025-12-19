import {
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandSubcommandsOnlyBuilder,
  ClientEvents,
  Client,
  Awaitable,
} from 'discord.js';

// Command interface
export interface Command {
  data:
    | SlashCommandBuilder
    | SlashCommandSubcommandsOnlyBuilder
    | Omit<SlashCommandBuilder, 'addSubcommand' | 'addSubcommandGroup'>;
  cooldown?: number;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

// Event interface
export interface Event<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute: (client: Client, ...args: ClientEvents[K]) => Awaitable<void>;
}

// Button interaction handler
export interface ButtonHandler {
  customId: string | RegExp;
  execute: (interaction: import('discord.js').ButtonInteraction) => Promise<void>;
}

// Select menu handler
export interface SelectMenuHandler {
  customId: string | RegExp;
  execute: (interaction: import('discord.js').StringSelectMenuInteraction) => Promise<void>;
}

// Modal handler
export interface ModalHandler {
  customId: string | RegExp;
  execute: (interaction: import('discord.js').ModalSubmitInteraction) => Promise<void>;
}
