const { SlashCommandBuilder } = require('discord.js');
const database = require('../utils/database.js');

module.exports = {
    name: 'coinflip',
    description: 'Flip a coin.',
    data: new SlashCommandBuilder().setName('coinflip').setDescription('Flip a coin.'),
    async execute(interaction) {
        if ((await database.get(`fun_enabled_${interaction.guild.id}`)) === 'disabled') return interaction.reply({ content: '❌ Disabled.', ephemeral: true });
        await interaction.reply(`🪙 It's **${Math.random() < 0.5 ? 'Heads' : 'Tails'}**!`);
    },
    async executePrefix(message) {
        if ((await database.get(`fun_enabled_${message.guild.id}`)) === 'disabled') return message.reply('❌ Disabled.');
        await message.channel.send(`🪙 It's **${Math.random() < 0.5 ? 'Heads' : 'Tails'}**!`);
    }
};
