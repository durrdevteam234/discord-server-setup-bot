const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database.js');

module.exports = {
    name: 'dice-duel',
    description: 'Challenge another user to an instant dice rolling duel.',
    data: new SlashCommandBuilder()
        .setName('dice-duel')
        .setDescription('Challenge another user to an instant dice rolling duel.')
        .addUserOption(option => option.setName('opponent').setDescription('The member you want to duel').setRequired(true)),

    async execute(interaction) {
        const currentStatus = (await database.get(`fun_enabled_${interaction.guild.id}`)) || 'enabled';
        if (currentStatus === 'disabled') return interaction.reply({ content: '🔒 The **Fun Module** is currently disabled on this server.', ephemeral: true });

        const opponent = interaction.options.getUser('opponent');
        if (opponent.id === interaction.user.id) return interaction.reply({ content: '❌ You cannot duel yourself!', ephemeral: true });

        const p1 = Math.floor(Math.random() * 6) + 1;
        const p2 = Math.floor(Math.random() * 6) + 1;
        
        let subtext = "";
        if (p1 === 6 && p2 === 1) subtext = "\n*Total devastation!*";
        if (p1 === 1 && p2 === 1) subtext = "\n*Double snake eyes! Incredible disappointment.*";

        let result = p1 > p2 ? `🏆 **${interaction.user.username}** wins!` : p1 < p2 ? `🏆 **${opponent.username}** wins!` : "🎲 It's a flat tie!";

        const embed = new EmbedBuilder()
            .setTitle('🎲 Instant Dice Duel')
            .setDescription(`**${interaction.user.username}** rolled: \`${p1}\`\n**${opponent.username}** rolled: \`${p2}\`\n\n${result}${subtext}`)
            .setColor('#9B59B6');
        await interaction.reply({ embeds: [embed] });
    },
    async executePrefix(message, args) {
        const currentStatus = (await database.get(`fun_enabled_${message.guild.id}`)) || 'enabled';
        if (currentStatus === 'disabled') return;

        const opponent = message.mentions.users.first();
        if (!opponent) return message.reply('❌ Please mention a user to challenge! Example: `|dice-duel @user`');
        if (opponent.id === message.author.id) return message.reply('❌ You cannot duel yourself!');

        const p1 = Math.floor(Math.random() * 6) + 1;
        const p2 = Math.floor(Math.random() * 6) + 1;
        let result = p1 > p2 ? `🏆 **${message.author.username}** wins!` : p1 < p2 ? `🏆 **${opponent.username}** wins!` : "🎲 It's a flat tie!";

        const embed = new EmbedBuilder()
            .setTitle('🎲 Instant Dice Duel')
            .setDescription(`**${message.author.username}** rolled: \`${p1}\`\n**${opponent.username}** rolled: \`${p2}\`\n\n${result}`)
            .setColor('#9B59B6');
        await message.channel.send({ embeds: [embed] });
    }
};