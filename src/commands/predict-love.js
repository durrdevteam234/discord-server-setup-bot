const { SlashCommandBuilder } = require('discord.js');
const database = require('../utils/database.js');

module.exports = {
    name: 'predict-love',
    description: 'Calculate the total calculated compatibility percentage between two objects.',
    data: new SlashCommandBuilder()
        .setName('predict-love')
        .setDescription('Calculate love rate percentage.')
        .addStringOption(o => o.setName('first').setDescription('First item/name').setRequired(true))
        .addStringOption(o => o.setName('second').setDescription('Second item/name').setRequired(true)),
    
    async execute(interaction) {
        if ((await database.get(`fun_enabled_${interaction.guild.id}`)) === 'disabled') return interaction.reply({ content: '❌ Disabled.', ephemeral: true });
        const name1 = interaction.options.getString('first');
        const name2 = interaction.options.getString('second');
        const percentage = Math.floor(Math.random() * 101);
        await interaction.reply(`❤️ **Love Compatibility Matcher** ❤️\n👥 **Targets:** ${name1} & ${name2}\n📊 **Result:** **${percentage}%** compatible!`);
    },
    async executePrefix(message, args) {
        if ((await database.get(`fun_enabled_${message.guild.id}`)) === 'disabled') return;
        const joined = args.join(' ').split(',');
        if (joined.length < 2) return message.reply('❌ Usage: `|predict-love Item1, Item2` (separate with a comma)');
        const percentage = Math.floor(Math.random() * 101);
        await message.channel.send(`❤️ **Love Compatibility Matcher** ❤️\n👥 **Targets:** ${joined[0].trim()} & ${joined[1].trim()}\n📊 **Result:** **${percentage}%** compatible!`);
    }
};
