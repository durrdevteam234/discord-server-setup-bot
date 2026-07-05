const { SlashCommandBuilder } = require('discord.js');
const database = require('../utils/database.js');

const questions = [
    ["Have all your thoughts broadcasted on a display screen", "Always have to speak every single thought out loud"],
    ["Be stuck on an island completely alone", "Be stuck on an island with someone you absolutely can't stand"],
    ["Always find hair in your food elements", "Always have wet socks on your feet wherever you go"],
    ["Be able to look 10 years into your own future", "Be able to see 100 years into the future of humanity"]
];

module.exports = {
    name: 'wouldyourather',
    description: 'Presents an impossible Choice A or Choice B split decision.',
    data: new SlashCommandBuilder().setName('wouldyourather').setDescription('Get a Would You Rather prompt.'),
    
    async execute(interaction) {
        if ((await database.get(`fun_enabled_${interaction.guild.id}`)) === 'disabled') return interaction.reply({ content: '❌ Disabled.', ephemeral: true });
        const set = questions[Math.floor(Math.random() * questions.length)];
        await interaction.reply(`❓ **Would You Rather...**\n\n🔵 **Choice A:** ${set[0]}\n🔴 **Choice B:** ${set[1]}`);
    },
    async executePrefix(message) {
        if ((await database.get(`fun_enabled_${message.guild.id}`)) === 'disabled') return;
        const set = questions[Math.floor(Math.random() * questions.length)];
        await message.channel.send(`❓ **Would You Rather...**\n\n🔵 **Choice A:** ${set[0]}\n🔴 **Choice B:** ${set[1]}`);
    }
};
