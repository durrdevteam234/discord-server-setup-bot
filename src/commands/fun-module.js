const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const database = require('../utils/database.js');

module.exports = {
    name: 'fun-module',
    description: 'Toggle status configurations for the interactive fun systems.',
    data: new SlashCommandBuilder()
        .setName('fun-module')
        .setDescription('Toggle status configurations for the interactive fun systems.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const currentStatus = (await database.get(`fun_enabled_${interaction.guild.id}`)) || 'enabled';

        const embed = new EmbedBuilder()
            .setTitle('🎮 Fun Module Configurations')
            .setDescription(`Control all mini-games, joke collections, trivia, and photo generators.\n\nCurrent Server Status: **${currentStatus.toUpperCase()}**`)
            .setColor(currentStatus === 'enabled' ? '#00FF00' : '#FF0000');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('fun_enable').setLabel('Enable Module').setStyle(ButtonStyle.Success).setDisabled(currentStatus === 'enabled'),
            new ButtonBuilder().setCustomId('fun_disable').setLabel('Disable Module').setStyle(ButtonStyle.Danger).setDisabled(currentStatus === 'disabled')
        );

        const response = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
        const collector = response.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) return i.reply({ content: '❌ Not your panel.', ephemeral: true });
            
            const newStatus = i.customId === 'fun_enable' ? 'enabled' : 'disabled';
            await database.set(`fun_enabled_${interaction.guild.id}`, newStatus);

            const updatedEmbed = EmbedBuilder.from(embed)
                .setDescription(`Control all mini-games, joke collections, trivia, and photo generators.\n\nCurrent Server Status: **${newStatus.toUpperCase()}**`)
                .setColor(newStatus === 'enabled' ? '#00FF00' : '#FF0000');

            const updatedRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('fun_enable').setLabel('Enable Module').setStyle(ButtonStyle.Success).setDisabled(newStatus === 'enabled'),
                new ButtonBuilder().setCustomId('fun_disable').setLabel('Disable Module').setStyle(ButtonStyle.Danger).setDisabled(newStatus === 'disabled')
            );

            await i.update({ embeds: [updatedEmbed], components: [updatedRow] });
        });
    },

    async executePrefix(message) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
            return message.reply('❌ Permissions required!');
        }
        const currentStatus = (await database.get(`fun_enabled_${message.guild.id}`)) || 'enabled';

        const embed = new EmbedBuilder()
            .setTitle('🎮 Fun Module Configurations')
            .setDescription(`Current Server Status: **${currentStatus.toUpperCase()}**`)
            .setColor(currentStatus === 'enabled' ? '#00FF00' : '#FF0000');

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('fun_enable').setLabel('Enable Module').setStyle(ButtonStyle.Success).setDisabled(currentStatus === 'enabled'),
            new ButtonBuilder().setCustomId('fun_disable').setLabel('Disable Module').setStyle(ButtonStyle.Danger).setDisabled(currentStatus === 'disabled')
        );

        const response = await message.channel.send({ embeds: [embed], components: [row] });
        const collector = response.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== message.author.id) return i.reply({ content: '❌ Not your panel.', ephemeral: true });

            const newStatus = i.customId === 'fun_enable' ? 'enabled' : 'disabled';
            await database.set(`fun_enabled_${message.guild.id}`, newStatus);

            const updatedEmbed = EmbedBuilder.from(embed)
                .setDescription(`Current Server Status: **${newStatus.toUpperCase()}**`)
                .setColor(newStatus === 'enabled' ? '#00FF00' : '#FF0000');

            const updatedRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('fun_enable').setLabel('Enable Module').setStyle(ButtonStyle.Success).setDisabled(newStatus === 'enabled'),
                new ButtonBuilder().setCustomId('fun_disable').setLabel('Disable Module').setStyle(ButtonStyle.Danger).setDisabled(newStatus === 'disabled')
            );

            await i.update({ embeds: [updatedEmbed], components: [updatedRow] });
        });
    }
};