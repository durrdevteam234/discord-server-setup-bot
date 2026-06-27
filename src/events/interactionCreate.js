const { Events } = require('discord.js');

module.exports = {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction) {
    // 1. Filter out everything that isn't a Slash/Chat command layout
    if (!interaction.isChatInputCommand()) return; 

    // Fetch the target command data layout loaded by index.js
    const command = interaction.client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      // Execute the slash command
      await command.execute(interaction);
    } catch (error) {
      console.error(`Error executing /${interaction.commandName}:`, error);
      
      // Fallback message execution handler so the user doesn't stay frozen on "thinking"
      const errorMessage = { content: '❌ There was an unexpected server error while executing this command!', ephemeral: true };
      
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(errorMessage).catch(() => null);
      } else {
        await interaction.reply(errorMessage).catch(() => null);
      }
    }
  },
};
