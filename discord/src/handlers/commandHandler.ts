import { Client, REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Command } from '../types/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadCommands(client: Client): Promise<void> {
  const commandsPath = join(__dirname, '..', 'commands');

  try {
    const categories = readdirSync(commandsPath);

    for (const category of categories) {
      const categoryPath = join(commandsPath, category);
      const commandFiles = readdirSync(categoryPath).filter(
        (file) => file.endsWith('.ts') || file.endsWith('.js')
      );

      for (const file of commandFiles) {
        const filePath = join(categoryPath, file);
        const command = (await import(filePath)) as { default: Command };

        if (command.default?.data && typeof command.default?.execute === 'function') {
          client.commands.set(command.default.data.name, command.default);
          console.log(`✅ Loaded command: ${command.default.data.name}`);
        } else {
          console.warn(`⚠️ Command at ${filePath} is missing required properties`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Error loading commands:', error);
  }
}

export async function registerCommands(): Promise<void> {
  const commands: object[] = [];
  const commandsPath = join(__dirname, '..', 'commands');

  try {
    const categories = readdirSync(commandsPath);

    for (const category of categories) {
      const categoryPath = join(commandsPath, category);
      const commandFiles = readdirSync(categoryPath).filter(
        (file) => file.endsWith('.ts') || file.endsWith('.js')
      );

      for (const file of commandFiles) {
        const filePath = join(categoryPath, file);
        const command = (await import(filePath)) as { default: Command };

        if (command.default?.data) {
          commands.push(command.default.data.toJSON());
        }
      }
    }

    const rest = new REST().setToken(process.env.DISCORD_TOKEN!);

    console.log(`🔄 Registering ${commands.length} slash commands...`);

    // Register commands globally or to a specific guild for development
    if (process.env.DISCORD_GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(
          process.env.DISCORD_CLIENT_ID!,
          process.env.DISCORD_GUILD_ID
        ),
        { body: commands }
      );
      console.log(`✅ Registered commands to guild ${process.env.DISCORD_GUILD_ID}`);
    } else {
      await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID!), {
        body: commands,
      });
      console.log('✅ Registered commands globally');
    }
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
}
