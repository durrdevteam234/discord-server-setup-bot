const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { logAction } = require('../utils/auditLog');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clear-channels')
    .setDescription('🗑️ Wipes all categories and channels from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  name: 'clear-channels',

  async execute(interaction) {
    const isInteraction = interaction.isCommand ? interaction.isCommand() : false;
    const memberExecutor = interaction.member;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.Administrator) && 
        !memberExecutor.permissions.has(PermissionFlagsBits.ManageGuild)) {
      const msg = '❌ You need **Administrator** or **Manage Server** permissions to wipe channels!';
      return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
    }

    // Handles safe execution message window tracking for both emulations natively
    if (isInteraction) {
      await interaction.deferReply({ ephemeral: true });
    } else {
      await interaction.reply('⏳ Creating secure execution routine...').catch(() => null);
    }

    const guild = interaction.guild;
    const originChannelId = interaction.channelId || interaction.channel?.id;
    const callerUser = interaction.user; // interaction emulator maps message author to user field

    try {
      const startMsg = '🗑️ Initiating total channel wipeout...';
      if (isInteraction) await interaction.editReply(startMsg);
      else await interaction.channel.send(startMsg).catch(() => null);

      let deletedCount = 0;

      for (const channel of guild.channels.cache.values()) {
        if (channel.id === originChannelId) continue; // Protect current execution window
        try {
          await channel.delete();
          deletedCount++;
          try { await logAction(guild, 'Channel Purged', callerUser, `Name: ${channel.name}`); } catch(e){}
        } catch (e) {
          console.error(`Could not delete channel ${channel.name}:`, e.message);
        }
      }

      const successMsg = `✅ Successfully wiped **${deletedCount}** channels and categories! Deleting this workspace...`;
      if (isInteraction) await interaction.editReply(successMsg);
      else await interaction.channel.send(successMsg).catch(() => null);

      setTimeout(async () => {
        const originChannel = guild.channels.cache.get(originChannelId) || await guild.channels.fetch(originChannelId).catch(() => null);
        if (originChannel) await originChannel.delete().catch(() => null);
      }, 3000);

    } catch (error) {
      console.error('Clear channels error:', error);
      const errMsg = `❌ Error during channel wipe: ${error.message}`;
      if (isInteraction) await interaction.editReply(errMsg).catch(() => null);
      else await interaction.channel.send(errMsg).catch(() => null);
    }
  },

  // ADDED: Complete prefix execution loop to handle |clear-channels natively
  async executePrefix(message, argsArray, client) {
    const guild = message.guild;
    if (!guild) return;

    const member = message.member;
    if (!member.permissions.has(PermissionFlagsBits.Administrator) && !member.permissions.has(PermissionFlagsBits.ManageGuild)) {
      return message.reply('❌ You require Manager or Administrator permissions to wipe channels.').catch(() => null);
    }

    // Emulate interaction context blocks so your core delete engine parses variables correctly
    const mockInteraction = {
      guild: message.guild,
      guildId: message.guild.id,
      channelId: message.channelId,
      channel: message.channel,
      member: message.member,
      user: message.author, // Maps message author directly to the expected user attribute
      reply: async (options) => message.reply(options)
    };

    await this.execute(mockInteraction).catch(err => console.error('Error handling inline clear-channels wrapper:', err));
  }
};
