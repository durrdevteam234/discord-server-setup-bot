const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database.js');

module.exports = {
    name: 'predict-love',
    description: 'Calculate the compatibility percentage between two items.',
    data: new SlashCommandBuilder()
        .setName('predict-love')
        .setDescription('Calculate the compatibility percentage between two items.')
        .addStringOption(option => option.setName('first').setDescription('First item/person').setRequired(true))
        .addStringOption(option => option.setName('second').setDescription('Second item/person').setRequired(true)),

    async execute(interaction) {
        const currentStatus = (await database.get(`fun_enabled_${interaction.guild.id}`)) || 'enabled';
        if (currentStatus === 'disabled') return interaction.reply({ content: '🔒 The **Fun Module** is currently disabled on this server.', ephemeral: true });

        const first = interaction.options.getString('first');
        const second = interaction.options.getString('second');
        const percentage = Math.floor(Math.random() * 101);

        let verdict = "⚠️ Incompatible components.";
        if (percentage > 25) verdict = "📉 Below average connection metrics.";
        if (percentage > 50) verdict = "⚖️ Stabilized affinity reading.";
        if (percentage > 75) verdict = "🔥 High energy attraction matrix detected!";
        if (percentage === 100) verdict = "💎 Complete absolute harmonic sync!";

        const embed = new EmbedBuilder()
            .setTitle('💞 Compatibility Machine')
            .setDescription(`Evaluating bond parameters...\n\n💖 **${first}** & **${second}**\nMatch Rating: **${percentage}%** Match!\n\n*${verdict}*`)
            .setColor('#9B59B6');
        await interaction.reply({ embeds: [embed] });
    },
    async executePrefix(message, args) {
        const currentStatus = (await database.get(`fun_enabled_${message.guild.id}`)) || 'enabled';
        if (currentStatus === 'disabled') return;

        const standardArgs = args.join(' ').split(',');
        const first = standardArgs[0]?.trim();
        const second = standardArgs[1]?.trim();

        if (!first || !second) return message.reply('❌ Usage error! Provide two inputs separated by a comma. Example: `|predict-love Coding, Coffee`');

        const percentage = Math.floor(Math.random() * 101);
        const embed = new EmbedBuilder()
            .setTitle('💞 Compatibility Machine')
            .setDescription(`Evaluating bond parameters...\n\n💖 **${first}** & **${second}**\nMatch Rating: **${percentage}%** Match!`)
            .setColor('#9B59B6');
        await message.channel.send({ embeds: [embed] });
    }
};