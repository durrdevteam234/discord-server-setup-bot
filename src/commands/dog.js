const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database.js');

module.exports = {
    name: 'dog',
    description: 'Fetch a random cute dog picture.',
    data: new SlashCommandBuilder().setName('dog').setDescription('Fetch a random cute dog picture.'),

    async execute(interaction) {
        const currentStatus = (await database.get(`fun_enabled_${interaction.guild.id}`)) || 'enabled';
        if (currentStatus === 'disabled') return interaction.reply({ content: '🔒 The **Fun Module** is currently disabled on this server.', ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('🐶 Woof!')
            .setImage(`https://dog.ceo/api/breeds/image/random?t=${Date.now()}`)
            .setColor('#9B59B6');
        await interaction.reply({ embeds: [embed] });
    },
    async executePrefix(message) {
        const currentStatus = (await database.get(`fun_enabled_${message.guild.id}`)) || 'enabled';
        if (currentStatus === 'disabled') return;

        const embed = new EmbedBuilder()
            .setTitle('🐶 Woof!')
            .setImage(`https://dog.ceo/api/breeds/image/random?t=${Date.now()}`)
            .setColor('#9B59B6');
        await message.channel.send({ embeds: [embed] });
    }
};