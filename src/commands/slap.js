const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database.js');

const slapPhrases = [
    "swings a wet, smelly yellow trout right across the face of",
    "slaps around the head with a rolled-up magazine",
    "launches a gigantic foam pie directly into the face of",
    "smacks with a legendary white squeaky rubber hammer",
    "delivered an absolute textbook facepalm hit to"
];

module.exports = {
    name: 'slap',
    description: 'Slap another user with a funny item.',
    data: new SlashCommandBuilder()
        .setName('slap')
        .setDescription('Slap another user with a funny item.')
        .addUserOption(option => option.setName('user').setDescription('The user to slap').setRequired(true)),

    async execute(interaction) {
        const currentStatus = (await database.get(`fun_enabled_${interaction.guild.id}`)) || 'enabled';
        if (currentStatus === 'disabled') return interaction.reply({ content: '🔒 The **Fun Module** is currently disabled on this server.', ephemeral: true });

        const user = interaction.options.getUser('user');
        const phrase = slapPhrases[Math.floor(Math.random() * slapPhrases.length)];

        const embed = new EmbedBuilder()
            .setDescription(`💥 **${interaction.user.username}** ${phrase} **${user.username}**!`)
            .setColor('#9B59B6');
        await interaction.reply({ embeds: [embed] });
    },
    async executePrefix(message) {
        const currentStatus = (await database.get(`fun_enabled_${message.guild.id}`)) || 'enabled';
        if (currentStatus === 'disabled') return;

        const member = message.mentions.members.first();
        if (!member) return message.reply('❌ Please mention a user to slap!');

        const phrase = slapPhrases[Math.floor(Math.random() * slapPhrases.length)];
        const embed = new EmbedBuilder()
            .setDescription(`💥 **${message.author.username}** ${phrase} **${member.user.username}**!`)
            .setColor('#9B59B6');
        await message.channel.send({ embeds: [embed] });
    }
};