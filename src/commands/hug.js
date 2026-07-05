const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database.js');

const hugGifs = [
    "wrapped their arms tightly around",
    "gave a giant, warm bear-hug to",
    "sent a lovely virtual squeeze across the network to",
    "tackled and hugged",
    "gave a reassuring, cozy side-hug to"
];

module.exports = {
    name: 'hug',
    description: 'Give a member a warm, fuzzy virtual hug.',
    data: new SlashCommandBuilder()
        .setName('hug')
        .setDescription('Give a member a warm, fuzzy virtual hug.')
        .addUserOption(option => option.setName('user').setDescription('The user to hug').setRequired(true)),

    async execute(interaction) {
        const currentStatus = (await database.get(`fun_enabled_${interaction.guild.id}`)) || 'enabled';
        if (currentStatus === 'disabled') return interaction.reply({ content: '🔒 The **Fun Module** is currently disabled on this server.', ephemeral: true });

        const user = interaction.options.getUser('user');
        const phrase = hugGifs[Math.floor(Math.random() * hugGifs.length)];

        const embed = new EmbedBuilder()
            .setDescription(`🤗 **${interaction.user.username}** ${phrase} **${user.username}**!`)
            .setColor('#9B59B6');
        await interaction.reply({ embeds: [embed] });
    },
    async executePrefix(message) {
        const currentStatus = (await database.get(`fun_enabled_${message.guild.id}`)) || 'enabled';
        if (currentStatus === 'disabled') return;

        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ Please mention a user to hug!');

        const phrase = hugGifs[Math.floor(Math.random() * hugGifs.length)];
        const embed = new EmbedBuilder()
            .setDescription(`🤗 **${message.author.username}** ${phrase} **${member.user.username}**!`)
            .setColor('#9B59B6');
        await message.channel.send({ embeds: [embed] });
    }
};