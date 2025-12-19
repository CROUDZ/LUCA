import { Client, ClientEvents } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Event } from '../types/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function loadEvents(client: Client): Promise<void> {
  const eventsPath = join(__dirname, '..', 'events');

  try {
    const eventFiles = readdirSync(eventsPath).filter(
      (file) => file.endsWith('.ts') || file.endsWith('.js')
    );

    for (const file of eventFiles) {
      const filePath = join(eventsPath, file);
      const event = (await import(filePath)) as { default: Event<keyof ClientEvents> };

      if (event.default?.name && event.default?.execute) {
        if (event.default.once) {
          client.once(event.default.name, (...args) => event.default.execute(client, ...args));
        } else {
          client.on(event.default.name, (...args) => event.default.execute(client, ...args));
        }
        console.log(`✅ Loaded event: ${event.default.name}`);
      } else {
        console.warn(`⚠️ Event at ${filePath} is missing required properties`);
      }
    }
  } catch (error) {
    console.error('❌ Error loading events:', error);
  }
}
