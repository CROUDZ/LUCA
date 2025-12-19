import 'dotenv/config';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import express from 'express';
import { loadEvents } from './handlers/eventHandler.js';
import { loadCommands, registerCommands } from './handlers/commandHandler.js';
import { loadInteractionHandlers } from './handlers/interactionHandler.js';
import { Command } from './types/index.js';
import {
  initModModerationService,
  getModModerationService,
  ModSubmissionData,
} from './lib/modModerationService.js';

// Extend Discord.js Client
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>;
  }
}

// Initialize Discord Client
const client = new Client({
  intents: [53608447],
});

// Initialize commands collection
client.commands = new Collection<string, Command>();

// Initialize Express server for webhooks/API
const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    botReady: client.isReady(),
    guilds: client.guilds.cache.size,
  });
});

// API routes can be added here
app.get('/api/stats', (req, res) => {
  if (!client.isReady()) {
    return res.status(503).json({ error: 'Bot not ready' });
  }

  res.json({
    guilds: client.guilds.cache.size,
    users: client.users.cache.size,
    channels: client.channels.cache.size,
  });
});

// API endpoint pour envoyer une notification de mod
app.post('/api/mod-notification', async (req, res) => {
  const { secret, mod } = req.body as { secret: string; mod: ModSubmissionData };

  // Vérifier le secret
  if (secret !== process.env.MOD_MODERATION_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!client.isReady()) {
    return res.status(503).json({ error: 'Bot not ready' });
  }

  const service = getModModerationService();
  if (!service) {
    return res.status(500).json({ error: 'Moderation service not initialized' });
  }

  try {
    const success = await service.sendModSubmissionNotification(mod);
    if (success) {
      res.json({ success: true, message: 'Notification sent' });
    } else {
      res.status(500).json({ error: 'Failed to send notification' });
    }
  } catch (error) {
    console.error('Error sending mod notification:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Start the bot
async function main() {
  try {
    // Load commands and events
    await loadCommands(client);
    await loadEvents(client);
    await loadInteractionHandlers();

    // Register slash commands with Discord
    await registerCommands();

    // Login to Discord
    await client.login(process.env.DISCORD_TOKEN);

    // Initialize mod moderation service after login
    initModModerationService(client);
    console.log('✅ Mod moderation service initialized');

    // Start Express server
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`🌐 Express server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

main();
