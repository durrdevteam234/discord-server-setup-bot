const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purpose')
    .setDescription('Learn about the bot and see its profile picture'),

  async execute(interaction) {
    try {
      const cute = readData('cute.json');
      const isCute = cute[interaction.guildId]?.[interaction.user.id] || false;

      const botUser = interaction.client.user;

      const embed = new EmbedBuilder()
        .setColor(isCute ? '#FF69B4' : '#0099FF')
        .setTitle(isCute ? '✨ About Me ✨' : '🤖 About Me')
        .setThumbnail(botUser.displayAvatarURL({ size: 512 }))
        .setDescription(isCute 
          ? '(´｀)♡ Hi! I\'m a Discord bot created to help manage and organize your server! ♡(´｀)' 
          : 'Hi! I\'m a Discord bot created to help manage and organize your server!'
        )
        .addFields(
          { 
            name: isCute ? '💖 My Purpose' : '🎯 My Purpose', 
            value: isCute
              ? '✨ I help you set up your server with templates\n✨ Manage moderation (ban, kick, mute, warn)\n✨ Run a leveling system for your members\n✨ Handle support tickets\n✨ Keep your server organized and fun! ♡'
              : '• Set up your server with templates\n• Manage moderation (ban, kick, mute, warn)\n• Run a leveling system for your members\n• Handle support tickets\n• Keep your server organized'
          },
          { 
            name: isCute ? '💕 Features' : '⚡ Features', 
            value: isCute
              ? '✨ Server Setup Templates\n✨ Leveling System\n✨ Moderation Tools\n✨ Ticket System\n✨ Cute Mode! (´｀)♡'
              : '• Server Setup Templates\n• Leveling System\n• Moderation Tools\n• Ticket System\n• Customizable Settings'
          },
          { 
            name: isCute ? '💗 Creator' : '👨‍💻 Creator', 
            value: 'Created with ❤️ for Discord communities' 
          }
        )
        .setFooter({ text: isCute ? '✨ Thank you for using me! ✨' : 'Thank you for using me!' });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Purpose error:', error);
      await interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true });
    }
  },
};
