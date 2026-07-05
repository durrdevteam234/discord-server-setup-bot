const { SlashCommandBuilder } = require('discord.js');
const database = require('../utils/database.js');

const triviaPool = [
    { q: "What is the capital city of Australia?", a: "Canberra" },
    { q: "Which planet is known as the Red Planet?", a: "Mars" },
    { q: "What is the largest chemical element symbol 'O' on the periodic table?", a: "Oxygen" },
    { q: "What year did the Titanic sink?", a: "1912" },
    { q: "How many bones are there in an adult human body?", a: "206" }
];

module.exports = {
    name: 'trivia',
    description: 'Spits out a random brain-teaser trivia question.',
    data: new SlashCommandBuilder().setName('trivia').setDescription('Get a trivia question.'),
    
    async execute(interaction) {
        if ((await database.get(`fun_enabled_${interaction.guild.id}`)) === 'disabled') return interaction.reply({ content: '❌ Disabled.', ephemeral: true });
        const match = triviaPool[Math.floor(Math.random() * triviaPool.length)];
        await interaction.reply(`🧠 **Question:** ${match.q}\n||**Answer:** ${match.a}|| *(Click to reveal)*`);
    },
    async executePrefix(message) {
        if ((await database.get(`fun_enabled_${message.guild.id}`)) === 'disabled') return;
        const match = triviaPool[Math.floor(Math.random() * triviaPool.length)];
        await message.channel.send(`🧠 **Question:** ${match.q}\n||**Answer:** ${match.a}|| *(Click to reveal)*`);
    }
};
