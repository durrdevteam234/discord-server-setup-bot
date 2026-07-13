const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    MessageFlags,
    EmbedBuilder,
    ChannelType
  } = require('discord.js');
  const { Schema, model, models } = require('mongoose');
  
  // ─────────────────────────────────────────────────────────────
  // Database Config & Schema Definitions
  // ─────────────────────────────────────────────────────────────
  
  const ACCENT_COLOR = 0xed4245;
  
  const AutoDeleteSchema = new Schema({
    channelId: { type: String, required: true, unique: true },
    guildId: { type: String, required: true },
    lifespanSeconds: { type: Number, required: true } 
  });
  
  const AutoDelete = models.AutoDelete || model('AutoDelete', AutoDeleteSchema);
  
  // ─────────────────────────────────────────────────────────────
  // Slash Command Definition (Restricted to Administrators)
  // ─────────────────────────────────────────────────────────────
  
  const data = new SlashCommandBuilder()
    .setName('autodelete')
    .setDescription('Configure a customizable automatic message destruction profile for a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addIntegerOption((opt) =>
      opt.setName('seconds').setDescription('Lifespan of new text inside the channel in seconds (0 to turn off)').setRequired(true).setMinValue(0)
    )
    .addChannelOption((opt) =>
      opt.setName('channel').setDescription('The channel to bind to (defaults to current)').addChannelTypes(ChannelType.GuildText).setRequired(false)
    );
  
  // ─────────────────────────────────────────────────────────────
  // Formatting & Execution Log Logic
  // ─────────────────────────────────────────────────────────────
  
  function isPrefixMode(interaction) {
    return typeof interaction.isChatInputCommand === 'function' && interaction.isChatInputCommand() === false;
  }
  
  function parsePrefixArgs(interaction) {
    const tokens = String(interaction.content || '').trim().split(/\s+/);
    let seconds = null;
    let targetChannel = interaction.channel;
  
    for (let i = 1; i < tokens.length; i++) {
      const val = parseInt(tokens[i], 10);
      if (!isNaN(val)) {
        seconds = val;
        break;
      }
    }
  
    if (interaction.mentions?.channels?.size > 0) {
      targetChannel = interaction.mentions.channels.first();
    }
  
    return { seconds, targetChannel };
  }
  
  // ─────────────────────────────────────────────────────────────
  // Runtime Transaction Controller Entry Points
  // ─────────────────────────────────────────────────────────────
  
  async function processConfiguration(interaction, seconds, targetChannel) {
    if (!targetChannel.permissionsFor(interaction.guild.members.me).has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({
        content: `❌ I lack the **Manage Messages** bot client permissions flag configuration inside ${targetChannel}.`,
        flags: [MessageFlags.Ephemeral]
      });
    }
  
    if (seconds === 0) {
      await AutoDelete.deleteOne({ channelId: targetChannel.id });
      return interaction.reply({ content: `✅ Auto-delete profile disabled for ${targetChannel}. Messages will persist indefinitely.` });
    }
  
    await AutoDelete.findOneAndUpdate(
      { channelId: targetChannel.id },
      {
        channelId: targetChannel.id,
        guildId: interaction.guild.id,
        lifespanSeconds: seconds
      },
      { upsert: true }
    );
  
    const embed = new EmbedBuilder()
      .setTitle('⏳ Auto-Delete Sequence Configured')
      .setDescription(`All fresh content streams sent downstream inside this hub are bound to destructive lifespan execution limits.`)
      .addFields(
        { name: 'Target Channel', value: `${targetChannel}`, inline: true },
        { name: 'Lifespan Interval', value: `\`${seconds} second${seconds === 1 ? '' : 's'}\``, inline: true }
      )
      .setColor(ACCENT_COLOR)
      .setTimestamp();
  
    return interaction.reply({ embeds: [embed] });
  }
  
  module.exports = {
    data,
    async execute(interaction) {
      if (!interaction.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
        const denyText = '❌ Access Denied: This utility requires **Administrator** security clearance.';
        return isPrefixMode(interaction) ? interaction.reply({ content: denyText }) : interaction.reply({ content: denyText, flags: [MessageFlags.Ephemeral] });
      }
  
      if (isPrefixMode(interaction)) {
        const parsed = parsePrefixArgs(interaction);
        if (parsed.seconds === null || parsed.seconds < 0) {
          return interaction.reply({ content: '❌ Invalid utilization structure.\n**Usage:** `|autodelete [seconds] [#channel]` (Set to 0 to disable)' });
        }
        return processConfiguration(interaction, parsed.seconds, parsed.targetChannel);
      }
  
      const seconds = interaction.options.getInteger('seconds');
      const channel = interaction.options.getChannel('channel') || interaction.channel;
      return processConfiguration(interaction, seconds, channel);
    },
  
    /**
     * Automatically triggered by messageCreate.js background loop worker tracker
     */
    async trackAndQueueDeletion(message) {
      if (!message.guild || message.author.bot) return;
  
      const channelProfile = await AutoDelete.findOne({ channelId: message.channel.id });
      if (!channelProfile) return;
  
      // 1. Send warning message immediately
      try {
        const warnEmbed = new EmbedBuilder()
          .setDescription(`⚠️ ${message.author}, messages in this channel are set to automatically delete after **${channelProfile.lifespanSeconds} seconds**.`)
          .setColor(ACCENT_COLOR);
  
        const warningMessage = await message.channel.send({ embeds: [warnEmbed] });
  
        // 2. Queue the deletion of the warning message after 5 seconds
        setTimeout(async () => {
          try {
            await warningMessage.delete();
          } catch (err) {
            if (err.code !== 10008) console.error('Failed to clean up autodelete alert text:', err.message);
          }
        }, 5000);
  
      } catch (err) {
        console.error('Failed to dispatch user autodelete notice embed message:', err.message);
      }
  
      // 3. Keep original message on its countdown lifespan track
      const delayMilliseconds = channelProfile.lifespanSeconds * 1000;
  
      setTimeout(async () => {
        try {
          if (message.deletable) {
            await message.delete();
          }
        } catch (err) {
          if (err.code !== 10008) {
            console.error(`AutoDelete failed to clear entry ${message.id}:`, err.message);
          }
        }
      }, delayMilliseconds);
    }
  };
  