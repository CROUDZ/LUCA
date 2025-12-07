import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, version as djsVersion } from 'discord.js';
import { Command } from '../../types/index.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Get information about the bot'),
  
  execute: async (interaction: ChatInputCommandInteraction) => {
    const client = interaction.client;
    
    const uptime = formatUptime(client.uptime || 0);
    const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
    
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('📊 Bot Information')
      .setThumbnail(client.user?.displayAvatarURL() || '')
      .addFields(
        { name: '🤖 Bot', value: client.user?.tag || 'Unknown', inline: true },
        { name: '📡 Servers', value: `${client.guilds.cache.size}`, inline: true },
        { name: '👥 Users', value: `${client.users.cache.size}`, inline: true },
        { name: '⏱️ Uptime', value: uptime, inline: true },
        { name: '💾 Memory', value: `${memoryUsage} MB`, inline: true },
        { name: '📚 Discord.js', value: `v${djsVersion}`, inline: true },
        { name: '🟢 Node.js', value: process.version, inline: true },
      )
      .setFooter({ text: 'LUCA Discord Bot' })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
  },
};

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

export default command;
