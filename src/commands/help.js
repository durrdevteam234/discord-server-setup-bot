const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View the full list of available bot commands across pages.'),
  name: 'help',

  async execute(interaction) {
    const coreCommands = 
      "`/help` - View this help menu layout.\n" +
      "`/purpose` - Learn about the bot and see its profile picture.\n" +
      "`/rank` - Check your level and XP progress.\n" +
      "`/leaderboard` - View top 10 users by level.\n" +
      "`/ticket` - Create a private support ticket for help.\n" +
      "`/cute <style>` - Change font layout display options.\n" +
      "`/setup <template> [clear]` - Run server template builder layouts.";

    const funCommands = 
      "`/fun-menu` - Explore what the Fun Module is and view its available commands.\n" +
      "`/joke` / `/dadjoke` - Get a clean, funny joke.\n" +
      "`/fortune` - Reveals a prediction about your future.\n" +
      "`/spacefact` - Get a mind-blowing cosmic space fact.\n" +
      "`/cat` / `/dog` - Fetch a random cute animal picture.\n" +
      "`/trivia` - Spits out a random brain-teaser trivia question.\n" +
      "`/wouldyourather` - Presents an impossible split decision.\n" +
      "`/capital-quiz` - Tests your geographic knowledge of world capitals.\n" +
      "`/hug <user>` - Give a member a warm, fuzzy virtual hug.\n" +
      "`/slap <user>` - Slap another user with a giant yellow trout.\n" +
      "`/dice-duel <opponent>` - Challenge another user to a dice duel.\n" +
      "`/predict-love <a, b>` - Calculate compatibility percentage.\n" +
      "`/coinflip` / `/roll` / `/dice` - Run probability rolling games.\n" +
      "`/roast <user>` / `/rate <item>` / `/meme` - Whimsical entertainment utilities.";

    const roleCommands =
      "`|role user <@member> <@role>` — Add a role to a member.\n" +
      "`|role remove <@member> <@role>` — Remove a role from a member.\n" +
      "`|role create <name> [color]` — Build a new custom server role.\n" +
      "`|role delete <@role>` — Discard an old role.\n" +
      "`|role everyone/bots/humans <@role>` — Mass-assign roles directly.\n" +
      "`|role info/list <@role>` — View server directory hierarchies.\n" +
      "`|role color/rename/hoist/mentionable` — Modify individual properties.";

    const embedPage1 = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('📚 Help Menu — Page 1/3 (Core/Utility)')
      .setDescription('Use the buttons below to switch pages.')
      .addFields({ name: '⚙️ Core & Utility Commands', value: coreCommands })
      .setTimestamp();

    const embedPage2 = new EmbedBuilder()
      .setColor('#FF69B4')
      .setTitle('🎉 Help Menu — Page 2/3 (Fun Module)')
      .setDescription('Use the buttons below to switch pages.')
      .addFields({ name: '🎭 Fun & Interactive Modules', value: funCommands })
      .setTimestamp();

    const embedPage3 = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('🛡️ Help Menu — Page 3/3 (Role Management)')
      .setDescription('Advanced utility structures to manage roles quickly.')
      .addFields({ name: '🛠️ Role Administration commands', value: roleCommands })
      .setTimestamp();

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('help_page1').setLabel('Page 1 (Core)').setStyle(ButtonStyle.Primary).setDisabled(true),
      new ButtonBuilder().setCustomId('help_page2').setLabel('Page 2 (Fun)').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('help_page3').setLabel('Page 3 (Roles)').setStyle(ButtonStyle.Secondary)
    );

    const response = await interaction.reply({ embeds: [embedPage1], components: [buttons], fetchReply: true });

    const collector = response.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 90000
    });

    collector.on('collect', async (btnInteraction) => {
      const authorId = interaction.user ? interaction.user.id : interaction.author.id;
      if (btnInteraction.user.id !== authorId) {
        return btnInteraction.reply({ content: '❌ Run the command yourself to flip pages!', ephemeral: true });
      }

      buttons.components.forEach(btn => btn.setDisabled(false));

      if (btnInteraction.customId === 'help_page1') {
        buttons.components[0].setDisabled(true);
        await btnInteraction.update({ embeds: [embedPage1], components: [buttons] }).catch(() => null);
      } else if (btnInteraction.customId === 'help_page2') {
        buttons.components[1].setDisabled(true);
        await btnInteraction.update({ embeds: [embedPage2], components: [buttons] }).catch(() => null);
      } else if (btnInteraction.customId === 'help_page3') {
        buttons.components[2].setDisabled(true);
        await btnInteraction.update({ embeds: [embedPage3], components: [buttons] }).catch(() => null);
      }
    });

    collector.on('end', () => {
      buttons.components.forEach(btn => btn.setDisabled(true));
      interaction.editReply({ components: [buttons] }).catch(() => null);
    });
  },

  async executePrefix(message, args, client) {
    const mockInteraction = {
      author: message.author,
      reply: async (options) => message.reply(options),
      editReply: async (options) => {
        const msg = await message.channel.messages.fetch(message.id).catch(() => null);
        if (msg) return msg.edit(options);
      }
    };
    await this.execute(mockInteraction);
  }
};