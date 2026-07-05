const { SlashCommandBuilder } = require('discord.js');
const database = require('../utils/database.js');

module.exports = {
    name: 'roll',
    description: 'Roll a 6-sided die.',
    data: new SlashCommandBuilder().setName('roll').setDescription('Roll a 6-sided die.'),
    async execute(interaction) {
        if ((await database.get(`fun_enabled_${interaction.guild.id}`)) === 'disabled') return interaction.reply({ content: '❌ Disabled.', ephemeral: true });
        await interaction.reply(`🎲 You rolled a **${Math.floor(Math.random() * 6) + 1}**!`);
    },
    async executePrefix(message) {
        if ((await database.get(`fun_enabled_${message.guild.id}`)) === 'disabled') return message.reply('❌ Disabled.');
        await message.channel.send(`🎲 You rolled a **${Math.floor(Math.random() * 6) + 1}**!`);
    }
};
