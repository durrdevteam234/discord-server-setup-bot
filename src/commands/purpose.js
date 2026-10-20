const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCuteStyle } = require('../utils/database');

// Central configuration renderer used by both execution modes
async function generatePurposeEmbed(client, guildId) {
  const currentStyle = await getCuteStyle(guildId);
  const isCute = currentStyle && currentStyle !== 'off';

  const botUser = client.user;

  return new EmbedBuilder()
    .setColor(isCute ? '#FF69B4' : '#0099FF')
    .setTitle(isCute ? '✨ About Me ✨' : '🤖 About Me')
    .setThumbnail(botUser.displayAvatarURL({ size: 512 }))
    .setDescription(isCute 
      ? "(´｀)♡ Hi! I'm a Discord bot created to help manage and organize your server! ♡(´｀)" 
      : "Hi! I'm a Discord bot created to help manage and organize your server!"
    )
    .addFields(
      {
        name: isCute ? '💖 My Purpose' : '🎯 My Purpose',
        value: isCute
          ? '✨ Set up your server with templates\n✨ Manage moderation like bans, kicks, mutes, and warns\n✨ Run a leveling system for your members\n✨ Handle support tickets\n✨ Keep your server organized and fun! ♡'
          : '• Set up your server with templates\n• Manage moderation like bans, kicks, mutes, and warns\n• Run a leveling system for your members\n• Handle support tickets\n• Keep your server organized'
      },
      {
        name: isCute ? '💕 Features' : '⚡ Features',
        value: isCute
          ? '✨ Server setup templates\n✨ Leveling system\n✨ Moderation tools\n✨ Ticket system\n✨ Cute mode! (´｀)♡'
          : '• Server setup templates\n• Leveling system\n• Moderation tools\n• Ticket system\n• Customizable settings'
      },
      {
        name: isCute ? '💗 Creator' : '👨‍💻 Creator',
        value: 'Created with ❤️ for Discord communities'
      }
    )
    .setFooter({ text: isCute ? '✨ Thank you for using me! ✨' : 'Thank you for using me!' });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purpose')
    .setDescription('Learn about the bot and see its profile picture'),

  // Gateway A: /purpose
  async execute(interaction) {
    try {
      const embed = await generatePurposeEmbed(interaction.client, interaction.guildId);
      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Purpose Slash command failed:', error);
      await interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true });
    }
  }
};
