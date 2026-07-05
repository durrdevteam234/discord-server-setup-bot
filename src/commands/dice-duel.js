const { SlashCommandBuilder } = require('discord.js');
const database = require('../utils/database.js');

module.exports = {
    name: 'dice-duel',
    description: 'Challenge another user to an instant randomized dice rolling duel.',
    data: new SlashCommandBuilder().setName('dice-duel').setDescription('Duel a user.').addUserOption(o => o.setName('opponent').setDescription('The user').setRequired(true)),
    
    async execute(interaction) {
        if ((await database.get(`fun_enabled_${interaction.guild.id}`)) === 'disabled') return interaction.reply({ content: '❌ Disabled.', ephemeral: true });
        const opp = interaction.options.getUser('opponent');
        const p1 = Math.floor(Math.random() * 6) + 1;
        const p2 = Math.floor(Math.random() * 6) + 1;
        let finalStr = `⚔️ **Dice Duel Between ${interaction.user.username} and ${opp.username}!**\n`;
        finalStr += `🎲 ${interaction.user.username} rolled: **${p1}**\n🎲 ${opp.username} rolled: **${p2}**\n\n`;
        if (p1 > p2) finalStr += `🏆 **${interaction.user.username} wins the duel!**`;
        else if (p2 > p1) finalStr += `🏆 **${opp.username} wins the duel!**`;
        else finalStr += `🤝 It's a flat **Tie!**`;
        await interaction.reply(finalStr);
    },
    async executePrefix(message) {
        if ((await database.get(`fun_enabled_${message.guild.id}`)) === 'disabled') return;
        const opp = message.mentions.users.first();
        if (!opp) return message.reply('❌ Mention your opponent!');
        const p1 = Math.floor(Math.random() * 6) + 1;
        const p2 = Math.floor(Math.random() * 6) + 1;
        let finalStr = `⚔️ **Dice Duel Between ${message.author.username} and ${opp.username}!**\n`;
        finalStr += `🎲 ${message.author.username} rolled: **${p1}**\n🎲 ${opp.username} rolled: **${p2}**\n\n`;
        if (p1 > p2) finalStr += `🏆 **${message.author.username} wins the duel!**`;
        else if (p2 > p1) finalStr += `🏆 **${opp.username} wins the duel!**`;
        else finalStr += `🤝 It's a flat **Tie!**`;
        await message.channel.send(finalStr);
    }
};
