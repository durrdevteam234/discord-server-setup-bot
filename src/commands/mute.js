const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { outranks } = require('../utils/hierarchy');
const { logAction } = require('../utils/auditLog');
const db = require('../utils/database'); // Restored your internal adapter mapping
const { createCase } = require('../utils/moderationCases');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a user for a custom duration (1m to 28d)')
    .addUserOption(option => option.setName('user').setDescription('User to mute').setRequired(true))
    .addStringOption(option =>
      option.setName('duration')
        .setDescription('Mute duration (e.g., 30m, 2h, 7d, 3w)')
        .setRequired(true)
    )
    .addStringOption(option => option.setName('reason').setDescription('Reason for mute').setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  name: 'mute',

  async execute(interaction, client) {
    await interaction.deferReply().catch(() => null);

    const guild = interaction.guild;
    const author = interaction.user;
    const memberExecutor = interaction.member;
    const guildId = interaction.guildId;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      const msg = '❌ You need Moderate Members permission!';
      return interaction.editReply({ content: msg });
    }

    try {
      const user = interaction.options.getUser('user');
      const durationInput = interaction.options.getString('duration');
      const reason = interaction.options.getString('reason') || 'No reason provided';

      if (!user) {
        const msg = '❌ Please mention a valid user or provide a valid user ID.';
        return interaction.editReply({ content: msg });
      }

      const member = await guild.members.fetch({ user: user.id, force: true }).catch(() => null);
      if (!member) {
        const msg = '❌ This user is not in the server! You cannot mute someone who is not here.';
        return interaction.editReply({ content: msg });
      }

      if (!durationInput) {
        const msg = '❌ Please specify a duration. Example: `30m`, `4h`, `5d`, `2w`';
        return interaction.editReply({ content: msg });
      }

      const durationRegex = /^(\d+)([mhdw])$/i;
      const match = durationInput.match(durationRegex);

      if (!match) {
        const msg = '❌ Invalid format! Use numbers followed by unit: `m` (minutes), `h` (hours), `d` (days), `w` (weeks).';
        return interaction.editReply({ content: msg });
      }

      const amount = parseInt(match[1], 10);
      const unit = match[2].toLowerCase();

      let durationMs = 0;
      if (unit === 'm') durationMs = amount * 60 * 1000;
      if (unit === 'h') durationMs = amount * 60 * 60 * 1000;
      if (unit === 'd') durationMs = amount * 24 * 60 * 60 * 1000;
      if (unit === 'w') durationMs = amount * 7 * 24 * 60 * 60 * 1000;

      const MIN_MS = 60 * 1000;
      const MAX_MS = 28 * 24 * 60 * 60 * 1000;

      if (durationMs < MIN_MS || durationMs > MAX_MS) {
        const msg = '❌ Duration must be between **1 minute (1m)** and **28 days (28d)**!';
        return interaction.editReply({ content: msg });
      }

      if (!member.moderatable || !outranks(memberExecutor, member)) {
        const msg = '❌ I cannot mute this user! Their roles might be higher than mine or yours.';
        return interaction.editReply({ content: msg });
      }

      await member.timeout(durationMs, reason);

      const mutes = (await db.readData('mutes.json')) || {};
      if (!mutes[guildId]) mutes[guildId] = {};
      mutes[guildId][user.id] = { muteEnd: Date.now() + durationMs, reason };
      await db.writeData('mutes.json', mutes);


      await logAction(guild, 'User Muted', author, `User: ${user.username}, Duration: ${durationInput}, Reason: ${reason}`);
      const moderationCase = await createCase({ guildId, action: 'mute', target: user, moderator: author, reason });

      const embed = new EmbedBuilder()
        .setColor('#FFFF00')
        .setTitle('✅ User Muted')
        .setDescription(`${user.username} has been muted for ${durationInput.toLowerCase()}.\nReason: ${reason}\nCase: **#${moderationCase.caseNumber}**`);

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Mute error:', error);
      const msg = `❌ Error muting user: ${error.message}`;
      return interaction.editReply({ content: msg });
    }
  },

  
};
