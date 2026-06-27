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

      // Check if client has a prefix property, otherwise fallback to '|'
      const prefix = interaction.client.prefix || '|';

      // Categorized command structures with explicit permission hints
      const publicCommands = [
        { name: '/help', desc: 'View this help menu layout.' },
        { name: '/ticket', desc: 'Create a private support ticket.' },
        { name: '/rank', desc: 'Check your level and XP progress.' },
        { name: '/leaderboard', desc: 'View top 10 users by level.' },
        { name: '/purpose', desc: 'Learn about the bot and see its profile picture.' },
      ];

      const staffCommands = [
        { name: '/setup', desc: 'Set up server templates (Gaming/Community/Study/Business).' },
        { name: '/ticket-staff close', desc: 'Close an active ticket.' },
        { name: '/ban', desc: 'Ban a user from the server.' },
        { name: '/kick', desc: 'Kick a user from the server.' },
        { name: '/mute', desc: 'Mute a user for a set duration.' },
        { name: '/unmute', desc: 'Unmute a muted user.' },
        { name: '/warn', desc: 'Issue a formal warning to a user.' },
        { name: '/warnings', desc: 'View current warnings for a specific user.' },
        { name: '/cute', desc: 'Toggle or configure cute text formatting styles.' },
      ];

      const embed = new EmbedBuilder()
        .setColor(isCute ? '#FF69B4' : '#0099FF')
        .setTitle(isCute ? '✨ Help Menu ✨' : '📚 Help Menu')
        .setDescription(`${isCute ? '(´｀)♡ ' : ''}Prefix: \`${prefix}\`${isCute ? ' ♡(´｀)' : ''}`)
        .addFields(
          { 
            name: isCute ? '💖 Member Commands' : '⚙️ Member Commands', 
            value: publicCommands.map(c => `\`${c.name}\` - ${c.desc}`).join('\n') 
          },
          { 
            name: isCute ? '🔒 Staff Commands (Staff Only)' : '🛠️ Staff Commands (Staff Only)', 
            value: staffCommands.map(c => `\`${c.name}\` - ${c.desc}`).join('\n') 
          },
          { 
            name: isCute ? '💕 Prefix Usage' : '📝 Prefix Usage', 
            value: `Use \`${prefix}commandname\` to execute commands via prefix\nExample: \`${prefix}rank\`` 
          }
        )
        .setFooter({ text: isCute ? '✨ Made with love ✨' : 'Use /help for more info' });

      // Check if it's a message or interaction reply to prevent crashes
      if (typeof interaction.reply === 'function' && !interaction.author) {
        await interaction.reply({ embeds: [embed] });
      } else {
        await interaction.channel.send({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Help error:', error);
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: `❌ Error: ${error.message}`, ephemeral: true });
      } else if (typeof interaction.reply === 'function' && !interaction.author) {
        await interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true });
      }
    }
  },
};
