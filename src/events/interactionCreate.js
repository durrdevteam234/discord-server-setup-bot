module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // Essential Guard: Let the command file collectors manage button responses directly
        // This ensures prefix button menus do not cause error crashes in the slash command router
        if (interaction.isMessageComponent()) return;

        // Process Chat Input / Slash Commands below cleanly:
        if (!interaction.isChatInputCommand()) return;
        
        const command = interaction.client.commands.get(interaction.commandName);
        if (!command) return;

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: '❌ There was an error executing this command!', ephemeral: true });
            } else {
                await interaction.reply({ content: '❌ There was an error executing this command!', ephemeral: true });
            }
        }
    },
};