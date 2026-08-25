const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

const OWNER_ID = process.env.OWNER_ID || '889540845269823559';

async function getInviteForGuild(guild) {
  try {
    const channel = guild.channels.cache.find(
      (c) =>
        c.type === ChannelType.GuildText &&
        c.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.CreateInstantInvite)
    );
    if (!channel) return '⚠️ Warning: No suitable channel found to create invite. The bot needs the "Create Invite" permission in a text channel.';

    // Always create a fresh invite so it's clearly attributed to the bot itself
    const invite = await channel.createInvite({
      maxAge: 0,      // never expires
      maxUses: 0,      // unlimited uses
      unique: true,    // forces a brand new invite, never reuses an existing one
    });
    return invite.url;
  } catch (err) {
    return '⚠️ Warning: Failed to create invite. Please check the bot permissions and try again.';
  }
}

module.exports = {
  name: 'guilds',
  data: new SlashCommandBuilder()
    .setName('guilds')
    .setDescription('Owner only: list all guilds the bot is in')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false),

  async execute(interaction, client) {
    const userId = interaction.user?.id || interaction.author?.id; // Simplified user ID check

    if (userId !== OWNER_ID) {
      return interaction.reply({ content: "❌ Error: This command can only be used by the Bot Owner!", ephemeral: true }).catch(() => null);
    }

    await interaction.deferReply({ ephemeral: true }).catch(() => null);

    const guilds = [...client.guilds.cache.values()].sort(
      (a, b) => b.memberCount - a.memberCount
    );

    const results = guilds.map(g => `**${g.name}** \`(${g.id})\` — ${g.memberCount} members`);

    let description = results.join('\n\n');
    if (description.length > 4000) {
      description = description.slice(0, 3990) + '\n…';
    }

    const embed = new EmbedBuilder()
      .setTitle(`📋 In ${guilds.length} guild(s)`)
      .setDescription(`${description}\n\nPress **Get Invite** to choose a server and generate an invite link.`)
      .setColor('#5865F2')
      .setTimestamp();

    const components = [];
    if (guilds.length > 0) {
      components.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('guilds_get_invite').setLabel('Get Invite').setStyle(ButtonStyle.Primary)
      ));
    }
    return interaction.editReply({ content: null, embeds: [embed], components });
  },

  async handleInteraction(interaction) {
    const userId = interaction.user?.id;
    if (userId !== OWNER_ID) return interaction.reply({ content: 'This control is only available to the bot owner.', ephemeral: true }).catch(() => null);
    const guilds = [...interaction.client.guilds.cache.values()].sort((a, b) => b.memberCount - a.memberCount);

    if (interaction.customId === 'guilds_get_invite') {
      const options = guilds.slice(0, 25).map(guild => ({
        label: guild.name.slice(0, 100),
        value: guild.id,
        description: `${guild.memberCount} members`,
      }));
      if (!options.length) return interaction.reply({ content: 'The bot is not currently in any guilds.', ephemeral: true });
      return interaction.update({
        content: 'Choose a server to generate an invite for:',
        embeds: [],
        components: [new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder().setCustomId('guilds_select_invite').setPlaceholder('Select a server...').addOptions(options)
        )],
      });
    }

    if (interaction.customId === 'guilds_select_invite' && interaction.isStringSelectMenu()) {
      await interaction.deferUpdate().catch(() => null);
      const guild = interaction.client.guilds.cache.get(interaction.values[0]);
      if (!guild) return interaction.editReply({ content: 'That server is no longer available.', components: [] });
      const invite = await getInviteForGuild(guild);
      const inviteEmbed = new EmbedBuilder()
        .setTitle(`🔗 Invite: ${guild.name}`)
        .setDescription(invite.startsWith('http') ? `[Click here to join ${guild.name}](${invite})\n\n\`${invite}\`` : invite)
        .setColor('#57F287');
      const components = invite.startsWith('http')
        ? [new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Join Server').setStyle(ButtonStyle.Link).setURL(invite))]
        : [];
      return interaction.editReply({ content: null, embeds: [inviteEmbed], components });
    }
  },
};