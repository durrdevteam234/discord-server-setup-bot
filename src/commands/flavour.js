const { SlashCommandBuilder } = require('discord.js');
const database = require('../utils/database.js');
const flavors = ["Classic Vanilla", "Dark Chocolate Spark", "Mint Condition Chip", "Salty Caramel Chaos", "Rocky Road to Success"];

module.exports = {
    name: 'flavor',
    description: 'Ice cream flavor personality.',
    data: new SlashCommandBuilder().setName('flavor').setDescription('Ice cream flavor personality.'),
    async execute(interaction) {
        if ((await database.get(`fun_enabled_${interaction.guild.id}`)) === 'disabled') return interaction.reply({ content: '❌ Disabled.', ephemeral: true });
        await interaction.reply(`🍦 Your personality flavor right now is: **${flavors[Math.floor(Math.random() * flavors.length)]}**!`);
    },
    async executePrefix(message) {
        if ((await database.get(`fun_enabled_${message.guild.id}`)) === 'disabled') return;
        await message.channel.send(`🍦 Your personality flavor right now is: **${flavors[Math.floor(Math.random() * flavors.length)]}**!`);
    }
};
