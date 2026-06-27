const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { logAction } = require('../utils/auditLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear-channels')
    .setDescription('🗑️ Wipes all categories and channels from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator) && 
        !interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ 
        content: '❌ You need **Administrator** or **Manage Server** permissions to wipe channels!', 
        ephemeral: true 
      });
    }

    await interaction.deferReply({ ephemeral: true });
    const guild = interaction.guild;
    const originChannelId = interaction.channelId;

    try {
      await interaction.editReply('🗑️ Initiating total channel wipeout...');
      let deletedCount = 0;

      for (const channel of guild.channels.cache.values()) {
        if (channel.id === originChannelId) continue; // Protect current execution window
        try {
          await channel.delete();
          deletedCount++;
          try { await logAction(guild, 'Channel Purged', interaction.user, `Name: ${channel.name}`); } catch(e){}
        } catch (e) {
          console.error(`Could not delete channel ${channel.name}:`, e.message);
        }
      }

      await interaction.editReply(`✅ Successfully wiped **${deletedCount}** channels and categories! Deleting this workspace...`);

      setTimeout(async () => {
        const originChannel = guild.channels.cache.get(originChannelId);
        if (originChannel) await originChannel.delete().catch(() => null);
      }, 3000);

    } catch (error) {
      console.error('Clear channels error:', error);
      await interaction.editReply(`❌ Error during channel wipe: ${error.message}`).catch(() => null);
    }
  },
};
