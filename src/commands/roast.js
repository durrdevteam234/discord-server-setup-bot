const { SlashCommandBuilder } = require('discord.js');
const database = require('../utils/database.js');

const intenseRoasts = [
    "I’d explain it to you, but I left my English-to-Dingbat dictionary at home.",
    "You’re the reason this server needs a dislike button.",
    "If I wanted to kill myself, I’d climb to your ego and jump to your IQ.",
    "You bring everyone so much joy... whenever you leave the voice channel.",
    "Your birth certificate is an apology letter from the condom factory.",
    "I'd love to insult you, but nature already did a flawless job.",
    "You have the charisma of a damp sponge.",
    "If you were any more useless, you'd be an open-source white crayon.",
    "You are the structural equivalent of wet cardboard.",
    "You're a conversation killer before the greeting even finishes.",
    "Some people bring happiness wherever they go; you bring happiness whenever you go."
];

module.exports = {
    name: 'roast',
    description: 'Deliver a devastating roast to someone.',
    data: new SlashCommandBuilder()
        .setName('roast')
        .setDescription('Deliver a devastating roast to someone.')
        .addUserOption(opt => opt.setName('target').setDescription('The user to roast').setRequired(true)),
    
    async execute(interaction) {
        if ((await database.get(`fun_enabled_${interaction.guild.id}`)) === 'disabled') {
            return interaction.reply({ content: '❌ The Fun Module is currently disabled.', ephemeral: true });
        }
        const target = interaction.options.getUser('target');
        const roast = intenseRoasts[Math.floor(Math.random() * intenseRoasts.length)];
        await interaction.reply(`${target}, ${roast}`);
    },

    async executePrefix(message, args) {
        if ((await database.get(`fun_enabled_${message.guild.id}`)) === 'disabled') return message.reply('❌ The Fun Module is disabled.');
        const target = message.mentions.users.first();
        if (!target) return message.reply('❌ Mention a user! Example: `|roast @username`');
        const roast = intenseRoasts[Math.floor(Math.random() * intenseRoasts.length)];
        await message.channel.send(`${target}, ${roast}`);
    }
};