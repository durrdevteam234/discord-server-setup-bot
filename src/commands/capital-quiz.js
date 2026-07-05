const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database.js');

const capitalPool = [
    { country: "Japan", capital: "Tokyo" },
    { country: "France", capital: "Paris" },
    { country: "Canada", capital: "Ottawa" },
    { country: "Brazil", capital: "Brasília" },
    { country: "Egypt", capital: "Cairo" },
    { country: "Germany", capital: "Berlin" },
    { country: "Italy", capital: "Rome" },
    { country: "South Korea", capital: "Seoul" },
    { country: "United Kingdom", capital: "London" },
    { country: "India", capital: "New Delhi" },
    { country: "Mexico", capital: "Mexico City" },
    { country: "Spain", capital: "Madrid" },
    { country: "Argentina", capital: "Buenos Aires" },
    { country: "South Africa", capital: "Pretoria / Cape Town / Bloemfontein" },
    { country: "Thailand", capital: "Bangkok" },
    { country: "Turkey", capital: "Ankara" },
    { country: "Greece", capital: "Athens" },
    { country: "New Zealand", capital: "Wellington" },
    { country: "Norway", capital: "Oslo" },
    { country: "Vietnam", capital: "Hanoi" }
];

module.exports = {
    name: 'capital-quiz',
    description: 'Tests your geographic knowledge of world capitals.',
    data: new SlashCommandBuilder().setName('capital-quiz').setDescription('Tests your geographic knowledge of world capitals.'),

    async execute(interaction) {
        const currentStatus = (await database.get(`fun_enabled_${interaction.guild.id}`)) || 'enabled';
        if (currentStatus === 'disabled') return interaction.reply({ content: '🔒 The **Fun Module** is currently disabled on this server.', ephemeral: true });

        const item = capitalPool[Math.floor(Math.random() * capitalPool.length)];
        const embed = new EmbedBuilder()
            .setTitle('🗺️ Capital Quiz')
            .setDescription(`**What is the capital city of ${item.country}?**\n\n||*Answer: ${item.capital}*||`)
            .setColor('#9B59B6');
        await interaction.reply({ embeds: [embed] });
    },
    async executePrefix(message) {
        const currentStatus = (await database.get(`fun_enabled_${message.guild.id}`)) || 'enabled';
        if (currentStatus === 'disabled') return;

        const item = capitalPool[Math.floor(Math.random() * capitalPool.length)];
        const embed = new EmbedBuilder()
            .setTitle('🗺️ Capital Quiz')
            .setDescription(`**What is the capital city of ${item.country}?**\n\n||*Answer: ${item.capital}*||`)
            .setColor('#9B59B6');
        await message.channel.send({ embeds: [embed] });
    }
};