const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database.js');

const triviaPool = [
    { q: "What gas do plants absorb from the atmosphere?", a: "Carbon Dioxide (CO2)" },
    { q: "Which planet in our solar system is known for its prominent rings?", a: "Saturn" },
    { q: "What is the hardest natural substance on Earth?", a: "Diamond" },
    { q: "Which ocean is the largest on Earth?", a: "Pacific Ocean" },
    { q: "Who painted the famous artwork 'The Starry Night'?", a: "Vincent van Gogh" },
    { q: "What is the chemical symbol for Gold?", a: "Au" },
    { q: "How many bones are there in an adult human body?", a: "206" },
    { q: "Which country is home to the Kangaroo?", a: "Australia" },
    { q: "What is the smallest country in the world by land area?", a: "Vatican City" },
    { q: "Which instrument is used to measure atmospheric pressure?", a: "Barometer" },
    { q: "What is the main ingredient in traditional guacamole?", a: "Avocado" },
    { q: "Which planet is closest to the Sun?", a: "Mercury" },
    { q: "Who is known as the author of 'Romeo and Juliet'?", a: "William Shakespeare" },
    { q: "What is the longest river in the world?", a: "Nile River" },
    { q: "What temperature does water freeze at in Fahrenheit?", a: "32°F" },
    { q: "What is the capital city of Australia?", a: "Canberra" },
    { q: "Which layer of the Earth is located directly beneath the crust?", a: "Mantle" },
    { q: "What is the largest type of shark currently living?", a: "Whale Shark" },
    { q: "Which element has the atomic number 1?", a: "Hydrogen" },
    { q: "In what year did the Titanic sink?", a: "1912" }
];

module.exports = {
    name: 'trivia',
    description: 'Spits out a random brain-teaser trivia question.',
    data: new SlashCommandBuilder().setName('trivia').setDescription('Spits out a random brain-teaser trivia question.'),

    async execute(interaction) {
        const currentStatus = (await database.get(`fun_enabled_${interaction.guild.id}`)) || 'enabled';
        if (currentStatus === 'disabled') return interaction.reply({ content: '🔒 The **Fun Module** is currently disabled on this server.', ephemeral: true });

        const item = triviaPool[Math.floor(Math.random() * triviaPool.length)];
        const embed = new EmbedBuilder()
            .setTitle('🧠 Trivia Time!')
            .setDescription(`**Question:** ${item.q}\n\n||*Answer: ${item.a}*||`)
            .setColor('#9B59B6');
        await interaction.reply({ embeds: [embed] });
    },
    async executePrefix(message) {
        const currentStatus = (await database.get(`fun_enabled_${message.guild.id}`)) || 'enabled';
        if (currentStatus === 'disabled') return;

        const item = triviaPool[Math.floor(Math.random() * triviaPool.length)];
        const embed = new EmbedBuilder()
            .setTitle('🧠 Trivia Time!')
            .setDescription(`**Question:** ${item.q}\n\n||*Answer: ${item.a}*||`)
            .setColor('#9B59B6');
        await message.channel.send({ embeds: [embed] });
    }
};