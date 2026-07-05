const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database.js');

const jokePool = [
    "Why don't scientists trust atoms? Because they make up everything!",
    "What do you call a fake noodle? An impasta.",
    "How does a penguin build its house? Igloos it together!",
    "Why did the scarecrow win an award? Because he was outstanding in his field!",
    "What do you call a factory that makes okay products? A satisfactory.",
    "Why do we tell actors to 'break a leg'? Because every play has a cast.",
    "Why did the bicycle fall over? Because it was two-tired!",
    "What do you call a sleeping dinosaur? A dino-snore!",
    "Why did the golfer bring two pairs of pants? In case he got a hole in one.",
    "What do you call cheese that isn't yours? Nacho cheese.",
    "Why can't a nose be 12 inches long? Because then it would be a foot.",
    "What kind of shoes do ninjas wear? Sneakers.",
    "How do celebrities stay cool? They have many fans.",
    "Why did the tomato turn red? Because it saw the salad dressing!",
    "What do you call a dynamic magician on a tractor? A dirt magician doing farming tricks."
];

module.exports = {
    name: 'joke',
    description: 'Get a clean, funny joke.',
    data: new SlashCommandBuilder().setName('joke').setDescription('Get a clean, funny joke.'),

    async execute(interaction) {
        const currentStatus = (await database.get(`fun_enabled_${interaction.guild.id}`)) || 'enabled';
        if (currentStatus === 'disabled') return interaction.reply({ content: '🔒 The **Fun Module** is currently disabled on this server.', ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('😂 Random Joke')
            .setDescription(jokePool[Math.floor(Math.random() * jokePool.length)])
            .setColor('#9B59B6');
        await interaction.reply({ embeds: [embed] });
    },
    async executePrefix(message) {
        const currentStatus = (await database.get(`fun_enabled_${message.guild.id}`)) || 'enabled';
        if (currentStatus === 'disabled') return;

        const embed = new EmbedBuilder()
            .setTitle('😂 Random Joke')
            .setDescription(jokePool[Math.floor(Math.random() * jokePool.length)])
            .setColor('#9B59B6');
        await message.channel.send({ embeds: [embed] });
    }
};