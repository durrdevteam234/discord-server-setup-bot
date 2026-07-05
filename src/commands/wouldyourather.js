const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database.js');

const wyrPool = [
    { a: "Be able to fly but only at walking speed", b: "Be able to teleport but only to places you can directly see" },
    { a: "Always say everything that comes into your mind", b: "Never speak another word for the rest of your life" },
    { a: "Have the ability to read everyone's mind", b: "Have the ability to see 5 minutes into your own future" },
    { a: "Live in a house underwater", b: "Live in a modular space station orbiting Earth" },
    { a: "Always be 15 minutes late to everything", b: "Always be 30 minutes early to everything" },
    { a: "Lose all your saved digital memories (photos/videos)", b: "Lose all physical items you bought in the past 5 years" },
    { a: "Be the smartest person alive but completely unknown", b: "Be incredibly famous but have average intelligence" },
    { a: "Only be able to eat your favorite sweet food forever", b: "Only be able to eat your favorite savory food forever" },
    { a: "Know the exact date of your death", b: "Know the exact cause of your death" },
    { a: "Have a perpetual itch you can never scratch", b: "Always feel like you are about to sneeze but never do" }
];

module.exports = {
    name: 'wouldyourather',
    description: 'Presents an impossible Choice A or Choice B split decision.',
    data: new SlashCommandBuilder().setName('wouldyourather').setDescription('Presents an impossible Choice A or Choice B split decision.'),

    async execute(interaction) {
        const currentStatus = (await database.get(`fun_enabled_${interaction.guild.id}`)) || 'enabled';
        if (currentStatus === 'disabled') return interaction.reply({ content: '🔒 The **Fun Module** is currently disabled on this server.', ephemeral: true });

        const item = wyrPool[Math.floor(Math.random() * wyrPool.length)];
        const embed = new EmbedBuilder()
            .setTitle('🤔 Would You Rather...')
            .setDescription(`**🔵 Option A:** ${item.a}\n\n**🔴 Option B:** ${item.b}`)
            .setColor('#9B59B6');
        await interaction.reply({ embeds: [embed] });
    },
    async executePrefix(message) {
        const currentStatus = (await database.get(`fun_enabled_${message.guild.id}`)) || 'enabled';
        if (currentStatus === 'disabled') return;

        const item = wyrPool[Math.floor(Math.random() * wyrPool.length)];
        const embed = new EmbedBuilder()
            .setTitle('🤔 Would You Rather...')
            .setDescription(`**🔵 Option A:** ${item.a}\n\n**🔴 Option B:** ${item.b}`)
            .setColor('#9B59B6');
        await message.channel.send({ embeds: [embed] });
    }
};