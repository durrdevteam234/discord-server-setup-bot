const { SlashCommandBuilder } = require('discord.js');
const database = require('../utils/database.js');

module.exports = {
    name: 'hug',
    description: 'Give a member a warm, fuzzy virtual hug.',
    data: new SlashCommandBuilder().setName('hug').setDescription('Hug someone.').addUserOption(o => o.setName('target').setDescription('The user').setRequired(true)),
    
    async execute(interaction) {
        if ((await database.get(`fun_enabled_${interaction.guild.id}`)) === 'disabled') return interaction.reply({ content: '❌ Disabled.', ephemeral: true });
        const target = interaction.options.getUser('target');
        await interaction.reply(`🤗 ${interaction.user} wraps their arms around ${target} for a big wholesome hug!`);
    },
    async executePrefix(message) {
        if ((await database.get(`fun_enabled_${message.guild.id}`)) === 'disabled') return;
        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ Mention someone to hug!');
        await message.channel.send(`🤗 ${message.author} wraps their arms around ${target} for a big wholesome hug!`);
    }
};
