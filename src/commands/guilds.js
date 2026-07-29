const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const OWNER_ID = process.env.OWNER_ID || 'YOUR_DISCORD_USER_ID';

module.exports = {
  name: 'guilds',
  data: new SlashCommandBuilder()
    .setName('guilds')
    .setDescription('Owner only: list all guilds the bot is in'),

  async execute(interaction, client) {
    const userId = interaction.user?.id || interaction.author?.id;

    if (userId !== OWNER_ID) {
      return interaction.reply({ content: "❌ You don't have permission to use this command." });
    }

    const guilds = [...client.guilds.cache.values()]
      .sort((a, b) => b.memberCount - a.memberCount);

    const lines = guilds.map(
      (g) => `**${g.name}** \`(${g.id})\` — ${g.memberCount} members`
    );

    let description = lines.join('\n');
    if (description.length > 4000) {
      description = description.slice(0, 3990) + '\n…';
    }

    const embed = new EmbedBuilder()
      .setTitle(`📋 In ${guilds.length} guild(s)`)
      .setDescription(description)
      .setColor('#5865F2')
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  },
};