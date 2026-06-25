const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all available commands and the bot prefix'),

  async execute(interaction) {
    try {
      const cute = readData('cute.json');
      const isCute = cute[interaction.guildId]?.[interaction.user.id] || false;

      const prefix = interaction.client.prefix;

      const commands = [
        { name: '/setup', desc: 'Set up the server with a template (Gaming/Community/Study/Business)' },
        { name: '/ticket create', desc: 'Create a private support ticket' },
        { name: '/ticket close', desc: 'Close a ticket (admin + creator only)' },
        { name: '/ban', desc: 'Ban a user from the server' },
        { name: '/kick', desc: 'Kick a user from the server' },
        { name: '/mute', desc: 'Mute a user for a set duration' },
        { name: '/unmute', desc: 'Unmute a user' },
        { name: '/warn', desc: 'Warn a user' },
        { name: '/warnings', desc: 'View warnings for a user' },
        { name: '/rank', desc: 'Check your level and XP progress' },
        { name: '/leaderboard', desc: 'View top 10 users by level' },
        { name: '/cute', desc: 'Toggle cute mode on or off' },
        { name: '/help', desc: 'View this help message' },
        { name: '/purpose', desc: 'Learn about the bot and see its profile picture' },
      ];

      const embed = new EmbedBuilder()
        .setColor(isCute ? '#FF69B4' : '#0099FF')
        .setTitle(isCute ? '✨ Help Menu ✨' : '📚 Help Menu')
        .setDescription(`${isCute ? '(´｀)♡ ' : ''}Prefix: \`${prefix}\`${isCute ? ' ♡(´｀)' : ''}`)
        .addFields(
          { name: isCute ? '💖 Slash Commands' : '⚙️ Slash Commands', value: commands.map(c => `\`${c.name}\` - ${c.desc}`).join('\n') },
          { name: isCute ? '💕 Prefix Usage' : '📝 Prefix Usage', value: `Use \`${prefix}commandname\` to execute commands via prefix\nExample: \`${prefix}rank\`` }
        )
        .setFooter({ text: isCute ? '✨ Made with love ✨' : 'Use /help for more info' });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Help error:', error);
      await interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true });
    }
  },
};
