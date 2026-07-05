const { SlashCommandBuilder } = require('discord.js');
const database = require('../utils/database.js');

const dadJokes = [
    "I'm reading a book on anti-gravity. I just can't put it down!",
    "What do you call a factory that makes okay products? A satisfactory.",
    "Dear Math, grow up and solve your own problems.",
    "Why did the bicycle fall over? Because it was two-tired!",
    "What do you call an alligator in a vest? An investigator.",
    "Why don't skeletons fight each other? They don't have the guts.",
    "Did you hear about the guy who invented the knock-knock joke? He won the no-bell prize.",
    "Why don't scientists trust atoms? Because they make up everything!"
];

module.exports = {
    name: 'dadjoke',
    description: 'Get a classic cringey dad joke.',
    data: new SlashCommandBuilder().setName('dadjoke').setDescription('Get a classic cringey dad joke.'),
    
    async execute(interaction) {
        if ((await database.get(`fun_enabled_${interaction.guild.id}`)) === 'disabled') return interaction.reply({ content: '❌ Disabled.', ephemeral: true });
        await interaction.reply(`👴 ${dadJokes[Math.floor(Math.random() * dadJokes.length)]}`);
    },
    async executePrefix(message) {
        if ((await database.get(`fun_enabled_${message.guild.id}`)) === 'disabled') return message.reply('❌ Disabled.');
        await message.channel.send(`👴 ${dadJokes[Math.floor(Math.random() * dadJokes.length)]}`);
    }
};
