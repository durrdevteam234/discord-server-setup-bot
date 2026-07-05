const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database.js');

const fortunePool = [
    "An exciting adventure awaits you next week!",
    "A golden opportunity will present itself shortly.",
    "Do not mistake temptation for opportunity.",
    "Your hard work will pay off very soon!",
    "A surprise message will bring joy to your evening.",
    "Trust your intuition; it is steering you in the right direction.",
    "An old friend will reconnect with you out of the blue.",
    "Wealth is coming your way, but it might not be financial.",
    "A peaceful mind brings inner strength and confidence.",
    "Your creative talents will soon be recognized by someone important.",
    "A small step today will lead to a giant leap tomorrow.",
    "Expect a pleasant shift in your daily routine very soon.",
    "The answers you seek are closer than you realize.",
    "Someone is thinking fondly of your kindness right now.",
    "A long-term project will yield incredible results."
];

module.exports = {
    name: 'fortune',
    description: 'Reveals a prediction about your future.',
    data: new SlashCommandBuilder().setName('fortune').setDescription('Reveals a prediction about your future.'),

    async execute(interaction) {
        const currentStatus = (await database.get(`fun_enabled_${interaction.guild.id}`)) || 'enabled';
        if (currentStatus === 'disabled') return interaction.reply({ content: '🔒 The **Fun Module** is currently disabled on this server.', ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('🔮 Your Fortune')
            .setDescription(fortunePool[Math.floor(Math.random() * fortunePool.length)])
            .setColor('#9B59B6');
        await interaction.reply({ embeds: [embed] });
    },
    async executePrefix(message) {
        const currentStatus = (await database.get(`fun_enabled_${message.guild.id}`)) || 'enabled';
        if (currentStatus === 'disabled') return;

        const embed = new EmbedBuilder()
            .setTitle('🔮 Your Fortune')
            .setDescription(fortunePool[Math.floor(Math.random() * fortunePool.length)])
            .setColor('#9B59B6');
        await message.channel.send({ embeds: [embed] });
    }
};