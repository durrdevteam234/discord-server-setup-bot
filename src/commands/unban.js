const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { logAction } = require('../utils/auditLog');
const database = require('../utils/database'); // Points to your live MongoDB client model

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user from the server using their username')
    .addStringOption(option => 
      option.setName('username')
        .setDescription('The exact username of the user to unban')
        .setRequired(true)
    )
    .addStringOption(option => 
      option.setName('reason')
        .setDescription('Reason for the unban')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  name: 'unban',

  async execute(interaction, client) {
    const isInteraction = interaction.isCommand ? interaction.isCommand() : false;
    const guild = interaction.guild;
    const author = interaction.user; 
    const memberExecutor = interaction.member;
    const guildId = interaction.guildId;

    if (!memberExecutor.permissions.has(PermissionFlagsBits.BanMembers)) {
      const msg = '❌ You need Ban Members permission to revoke bans!';
      return isInteraction ? interaction.reply({ content: msg, ephemeral: true }) : interaction.reply(msg);
    }

    try {
      let targetName;
      let reason;

      if (isInteraction) {
        targetName = interaction.options.getString('username').trim();
        reason = interaction.options.getString('reason') || 'No reason provided';
      } else {
        targetName = interaction.options.getString('username');
        reason = interaction.options.getString('reason') || 'No reason provided';
      }

      if (!targetName) {
        const msg = '❌ Please specify a username to unban! Example: `|unban john_doe`';
        return interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
      }

      // Fetch the full server ban registry directly from the Discord API
      const banList = await guild.bans.fetch({ cache: false }).catch(() => null);
      if (!banList || banList.size === 0) {
        const msg = '❌ There are no banned users registered on this server!';
        return interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
      }

      // 🔍 SCANNING ROUTINE: Search for a matching profile name inside the ban collection
      const targetNameLower = targetName.toLowerCase();
      const banEntry = banList.find(b => 
        b.user.username.toLowerCase() === targetNameLower || 
        b.user.tag.toLowerCase() === targetNameLower
      );

      if (!banEntry) {
        const msg = `❌ Could not find a banned user named **${targetName}**! Ensure spelling matches exactly.`;
        return interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
      }

      const user = banEntry.user;

      // Execute the native unban operation using the discovered user ID
      await guild.members.unban(user.id, reason);
      // ========================================================
      // MONGO-DB UNIFIED MOD LOGS SYSTEM RESOLUTION
      // ========================================================
      const guildConfig = await database.findOne({ guildId: guildId }).catch(() => null) || {};
      
      if (guildConfig.modLogsEnabled && guildConfig.unifiedLogChannelId) {
        const modLogsChannel = guild.channels.cache.get(guildConfig.unifiedLogChannelId) || await guild.channels.fetch(guildConfig.unifiedLogChannelId).catch(() => null);
        
        if (modLogsChannel) {
          const embedLog = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🛡️ Unified Moderation: User Unbanned')
            .addFields(
              { name: 'Target User', value: `${user.username} (${user.id})`, inline: true },
              { name: 'Responsible Staff', value: `${author.username}`, inline: true },
              { name: 'Reason Given', value: reason }
            )
            .setTimestamp();
          await modLogsChannel.send({ embeds: [embedLog] }).catch(() => null);
        }
      }

      await logAction(guild, 'User Unbanned', author, `User: ${user.username}, Reason: ${reason}`);

      const embed = new EmbedBuilder()
        .setColor('#00FF00')
        .setTitle('✅ User Unbanned')
        .setDescription(`**${user.username}** has been successfully unbanned.\nReason: ${reason}`);

      return interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Unban error:', error);
      const msg = `❌ Error unbanning user: ${error.message}`;
      return interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
    }
  },

  // Prefix translation pipeline parsing strings for username lookup compatibility
  async executePrefix(message, argsArray, client) {
    if (!message.member.permissions.has(PermissionFlagsBits.BanMembers)) {
      return message.reply('❌ Permissions required!').catch(() => null);
    }

    const usernameArg = argsArray ? argsArray.trim() : null;
    const reasonArg = argsArray && argsArray.length > 1 ? argsArray.slice(1).join(' ') : 'No reason provided';

    // Mock options emulator mapping text string metrics to target execute checks
    const mockInteraction = {
      guild: message.guild,
      guildId: message.guild.id,
      member: message.member,
      user: message.author,
      isCommand: () => false,
      options: {
        getString: (name) => name === 'username' ? usernameArg : reasonArg
      },
      reply: async (options) => message.reply(options)
    };

    await this.execute(mockInteraction, client).catch(err => console.error('Error handling inline unban prefix wrapper:', err));
  }
};

