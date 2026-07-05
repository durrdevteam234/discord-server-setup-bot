module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) { // explicitly passed down client
        // 1. Safety Gate: Completely ignore message components (Buttons, Select Menus)
        // Let the command collector handlers catch them locally.
        if (interaction.isMessageComponent()) return;

        // 2. Safety Gate: Completely ignore Autocomplete / Modals / Context Menus
        // If it isn't a traditional typed /slash command, skip it instantly.
        if (!interaction.isChatInputCommand()) return;
        
        // 3. Command Resolution Safe Lookup
        const commandName = interaction.commandName;
        if (!commandName) return;

        const command = interaction.client.commands.get(commandName) || client?.commands?.get(commandName);
        if (!command) {
            console.warn(`[WARNING] Received slash interaction for /${commandName}, but it is not registered in client.commands.`);
            return;
        }

        try {
            // Ensure client instance is safely passed if your slash handler uses it
            await command.execute(interaction, client || interaction.client);
        } catch (error) {
            console.error(`❌ Slash Command Error [/${commandName}]:`, error);
            
            const errorPayload = { content: '❌ There was an error executing this command!', ephemeral: true };
            
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorPayload).catch(() => null);
            } else {
                await interaction.reply(errorPayload).catch(() => null);
            }
        }
    },
};