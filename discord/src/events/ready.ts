import { Client } from 'discord.js';
import { Event } from '../types/index.js';

const event: Event<'ready'> = {
  name: 'ready',
  once: true,
  execute: async (client: Client) => {
    console.log(`🚀 Bot is ready! Logged in as ${client.user?.tag}`);
    console.log(`📊 Serving ${client.guilds.cache.size} guilds`);

    // Set bot status
    client.user?.setPresence({
      status: 'online',
      activities: [
        {
          name: 'LUCA Project',
          type: 0, // Playing
        },
      ],
    });
  },
};

export default event;
