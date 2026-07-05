const { SlashCommandBuilder } = require('discord.js');
const database = require('../utils/database.js');

module.exports = {
    name: 'slap',
    description: 'Slap another user with a giant, smelly yellow trout.',
    data: new SlashCommandBuilder().setName('slap').setDescription('Slap someone.').addUserOption(o => o.setName('target').setDescription('The user').setRequired(true)),
    
    async execute(interaction) {
        if ((await database.get(`fun_enabled_${interaction.guild.id}`)) === 'disabled') return interaction.reply({ content: '❌ Disabled.', ephemeral: true });
        const target = interaction.options.getUser('target');
        await interaction.reply(`💥 **Ouch!** ${interaction.user} winds up and slaps ${target} across the face with a large, smelly trout!`);
    },
    async executePrefix(message) {
        if ((await database.get(`fun_enabled_${message.guild.id}`)) === 'disabled') return;
        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ Mention someone to slap!');
        await message.channel.send(`💥 **Ouch!** ${message.author} winds up and slaps ${target} across the face with a large, smelly trout!`);
    }
};
