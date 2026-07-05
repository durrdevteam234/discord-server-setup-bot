const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database.js');

const spacePool = [
    "One day on Venus is longer than one year on Venus.",
    "The footprint left on the Moon will stay there for 100 million years because there is no wind.",
    "One million Earths could fit inside the Sun.",
    "Neutron stars can spin at a rate of 600 rotations per second.",
    "Space is completely silent because there is no atmosphere for sound waves to travel through.",
    "The sunset on Mars appears distinctly blue due to fine dust particles filtering light.",
    "There are more trees on Earth than there are stars in the Milky Way galaxy.",
    " Uranus spins horizontally on its side like a rolling ball.",
    "Halley's Comet won't pass by Earth again until the year 2061.",
    "The International Space Station completes an entire orbit around Earth every 90 minutes.",
    "Footsteps on the moon don't disappear because there is no liquid water or wind to erode them.",
    "Venus is the hottest planet in our solar system, reaching temperatures over 450°C.",
    "A single spacesuit costs around 12 million dollars to construct.",
    " Saturn has a massive hexagonal storm pattern raging permanently on its north pole.",
    "Jupiter's Great Red Spot is a giant cosmic storm that is wider than the planet Earth."
];

module.exports = {
    name: 'spacefact',
    description: 'Get a mind-blowing cosmic space fact.',
    data: new SlashCommandBuilder().setName('spacefact').setDescription('Get a mind-blowing cosmic space fact.'),

    async execute(interaction) {
        const currentStatus = (await database.get(`fun_enabled_${interaction.guild.id}`)) || 'enabled';
        if (currentStatus === 'disabled') return interaction.reply({ content: '🔒 The **Fun Module** is currently disabled on this server.', ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('🌌 Space Fact')
            .setDescription(spacePool[Math.floor(Math.random() * spacePool.length)])
            .setColor('#9B59B6');
        await interaction.reply({ embeds: [embed] });
    },
    async executePrefix(message) {
        const currentStatus = (await database.get(`fun_enabled_${message.guild.id}`)) || 'enabled';
        if (currentStatus === 'disabled') return;

        const embed = new EmbedBuilder()
            .setTitle('🌌 Space Fact')
            .setDescription(spacePool[Math.floor(Math.random() * spacePool.length)])
            .setColor('#9B59B6');
        await message.channel.send({ embeds: [embed] });
    }
};