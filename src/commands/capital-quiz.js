const { SlashCommandBuilder } = require('discord.js');
const database = require('../utils/database.js');

const dataPool = [
    { country: "Japan", cap: "Tokyo" },
    { country: "France", cap: "Paris" },
    { country: "Canada", cap: "Ottawa" },
    { country: "Brazil", cap: "Brasilia" },
    { country: "Italy", cap: "Rome" }
];

module.exports = {
    name: 'capital-quiz',
    description: 'Tests your geographic knowledge of world capitals.',
    data: new SlashCommandBuilder().setName('capital-quiz').setDescription('Get a capital city question.'),
    
    async execute(interaction) {
        if ((await database.get(`fun_enabled_${interaction.guild.id}`)) === 'disabled') return interaction.reply({ content: '❌ Disabled.', ephemeral: true });
        const target = dataPool[Math.floor(Math.random() * dataPool.length)];
        await interaction.reply(`🗺️ What is the capital city of **${target.country}**?\n||**Answer:** ${target.cap}|| *(Click to reveal)*`);
    },
    async executePrefix(message) {
        if ((await database.get(`fun_enabled_${message.guild.id}`)) === 'disabled') return;
        const target = dataPool[Math.floor(Math.random() * dataPool.length)];
        await message.channel.send(`🗺️ What is the capital city of **${target.country}**?\n||**Answer:** ${target.cap}|| *(Click to reveal)*`);
    }
};
