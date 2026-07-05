const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View the full list of available bot commands.'),
  name: 'help',

  async execute(interaction) {
    const normalCommands = 
      "`/help` - View this help menu layout.\n" +
      "`/purpose` - Learn about the bot and see its profile picture.\n" +
      "`/rank` - Check your level and XP progress.\n" +
      "`/leaderboard` - View top 10 users by level.\n" +
      "`/ticket` - Create a private support ticket for help.";

    const funCommands = 
      "`/fun-menu` - Explore what the Fun Module is and view its available commands.\n" +
      "`/joke` - Get a clean, funny joke.\n" +
      "`/fortune` - Reveals a prediction about your future.\n" +
      "`/spacefact` - Get a mind-blowing cosmic space fact.\n" +
      "`/cat` - Fetch a random cute cat picture.\n" +
      "`/dog` - Fetch a random cute dog picture.\n" +
      "`/trivia` - Spits out a random brain-teaser trivia question.\n" +
      "`/wouldyourather` - Presents an impossible split decision.\n" +
      "`/capital-quiz` - Tests your geographic knowledge of world capitals.";

    const interactiveCommands =
      "`/hug <user>` - Give a member a warm, fuzzy virtual hug.\n" +
      "`/slap <user>` - Slap another user with a giant yellow trout.\n" +
      "`/dice-duel <opponent>` - Challenge another user to a dice duel.\n" +
      "`/predict-love <a, b>` - Calculate compatibility percentage.";

    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('📚 Bot Command Help Menu')
      .setDescription('Here is a breakdown of all available commands. You can trigger them using `/` or the prefix `|`.')
      .addFields(
        { name: '⚙️ Core Commands', value: normalCommands },
        { name: '🎉 Fun & Games', value: funCommands },
        { name: '⚔️ Interactive & Social', value: interactiveCommands }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] }).catch(() => null);
  },

  async executePrefix(message, args, client) {
    // Dynamically leverage the exact same logic using our interaction emulator
    const mockInteraction = {
      reply: async (options) => message.reply(options)
    };
    await this.execute(mockInteraction);
  }
};