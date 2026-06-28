const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { readData } = require('../utils/database');
const { formatCute } = require('../utils/textFormatter.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View warnings for a user')
    .addUserOption(option => option.setName('user').setDescription('User to check').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(context, args = []) {
    const isInteraction = !!context.isChatInputCommand;
    const guild = context.guild;
    const memberExecutor = context.member;
    const guildId = context.guildId;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      const msg = '❌ You need Moderate Members permission!';
      return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
    }

    try {
      let user;

      if (isInteraction) {
        user = context.options.getUser('user');
      } else {
        user = context.mentions.users.first() || (args[0] ? await context.client.users.fetch(args[0]).catch(() => null) : null);
      }

      if (!user) {
        const msg = '❌ Please mention a valid user or provide a valid user ID.';
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      const warnings = readData('warnings.json');
      const userWarnings = warnings[guildId]?.[user.id] || [];

      if (userWarnings.length === 0) {
        const msg = `✅ ${user.tag} has no warnings!`;
        return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      const cuteData = readData('cute.json');
      const cuteStyle = cuteData[guildId] || 'off';
      const embedTitle = cuteStyle !== 'off' ? formatCute(`Warnings for ${user.username}`, cuteStyle, '📜') : `📜 Warnings for ${user.tag}`;

      const embed = new EmbedBuilder()
        .setColor('#FF6600')
        .setTitle(embedTitle)
        .setDescription(`Total Warnings: ${userWarnings.length}`);

      userWarnings.forEach((warning, index) => {
        embed.addFields({
          name: `Warning #${index + 1}`,
          value: `**Reason:** ${warning.reason}\n**Moderator:** ${warning.moderator}\n**Date:** ${new Date(warning.date).toLocaleString()}`,
        });
      });

      if (isInteraction) {
        await context.reply({ embeds: [embed], ephemeral: true });
      } else {
        await context.reply({ embeds: [embed] });
      }
    } catch (error) {
      console.error('Warnings error:', error);
      const msg = `❌ Error fetching warnings: ${error.message}`;
      if (isInteraction) {
        await context.reply({ content: msg, ephemeral: true });
      } else {
        await context.reply(msg);
      }
    }
  },
};
