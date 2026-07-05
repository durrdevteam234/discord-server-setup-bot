const { SlashCommandBuilder } = require('discord.js');
const database = require('../utils/database.js');

module.exports = {
    name: 'rate',
    description: 'Rate something from 0 to 10.',
    data: new SlashCommandBuilder().setName('rate').setDescription('Rate something.').addStringOption(opt => opt.setName('thing').setDescription('What to rate').setRequired(true)),
    
    async execute(interaction) {
        if ((await database.get(`fun_enabled_${interaction.guild.id}`)) === 'disabled') return interaction.reply({ content: '❌ Disabled.', ephemeral: true });
        const thing = interaction.options.getString('thing');
        await interaction.reply(`🔢 I rate **${thing}** a solid **${Math.floor(Math.random() * 11)}/10**!`);
    },
    async executePrefix(message, args) {
        if ((await database.get(`fun_enabled_${message.guild.id}`)) === 'disabled') return;
        if (!args.length) return message.reply('❌ What should I rate?');
        await message.channel.send(`🔢 I rate **${args.join(' ')}** a solid **${Math.floor(Math.random() * 11)}/10**!`);
    }
};
