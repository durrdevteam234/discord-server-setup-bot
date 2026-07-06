const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../utils/database.js');

module.exports = {
    name: 'coinflip',
    description: 'Flip a coin and see what it lands on.',
    data: new SlashCommandBuilder()
        .setName('coinflip')
        .setDescription('Flip a coin and see what it lands on.'),

    async execute(interaction) {
        // 1. Unified database architecture lookup
        const mainSettings = db.readData('settings.json') || {};
        const currentGuildSettings = mainSettings[interaction.guildId] || {};

        if (currentGuildSettings.funModule === 'disabled' || currentGuildSettings.funModule === false) {
            return interaction.reply({ 
                content: '🔒 The **Fun Module** features have been globally disabled by an administrator.', 
                flags: [MessageFlags.Ephemeral] 
            }).catch(() => null);
        }

        // 2. Perform randomization calculation
        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        
        // 3. Dynamic Font Style Layout Extraction
        let cuteStyle = 'off';
        try { const cuteData = db.readData('cute.json') || {}; cuteStyle = cuteData[interaction.guildId] || 'off'; } catch (e) {}
        const isCuteActive = cuteStyle !== 'off';

        // 4. Construct high-quality embed response
        const embed = new EmbedBuilder()
            .setTitle(isCuteActive ? '✨ 🪙 COIN FLIP ✨' : '🪙 Coin Flip')
            .setDescription(`The coin spins through the air and lands on...\n\n🎯 It's **${result}**!`)
            .setColor(isCuteActive ? '#FF69B4' : '#3498DB')
            .setThumbnail(result === 'Heads' 
                ? 'https://imgur.com' // Clean public placeholder for Heads
                : 'https://imgur.com' // Clean public placeholder for Tails
            );

        await interaction.reply({ embeds: [embed] }).catch(() => null);
    },

    async executePrefix(message, args, client) {
        // 1. Framework switch verification for prefix calls
        const mainSettings = db.readData('settings.json') || {};
        const currentGuildSettings = mainSettings[message.guild?.id] || {};

        if (currentGuildSettings.funModule === 'disabled' || currentGuildSettings.funModule === false) {
            return message.reply('❌ The complete **Fun Command Suite** has been globally disabled by a server administrator.').catch(() => null);
        }

        const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
        
        let cuteStyle = 'off';
        try { const cuteData = db.readData('cute.json') || {}; cuteStyle = cuteData[message.guild?.id] || 'off'; } catch (e) {}
        const isCuteActive = cuteStyle !== 'off';

        const embed = new EmbedBuilder()
            .setTitle(isCuteActive ? '✨ 🪙 COIN FLIP ✨' : '🪙 Coin Flip')
            .setDescription(`The coin spins through the air and lands on...\n\n🎯 It's **${result}**!`)
            .setColor(isCuteActive ? '#FF69B4' : '#3498DB')
            .setThumbnail(result === 'Heads' ? 'https://imgur.com' : 'https://imgur.com');

        await message.reply({ embeds: [embed] }).catch(() => null);
    }
};
