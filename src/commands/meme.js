const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database.js');

// A diverse pool of subreddits to pull different styles of memes from
const subreddits = ['memes', 'dankmemes', 'wholesomememes', 'me_irl'];

async function getMemeEmbed() {
    // Pick a random subreddit from our pool to keep content fresh
    const randomSub = subreddits[Math.floor(Math.random() * subreddits.length)];
    const response = await fetch(`https://meme-api.com/gimme/${randomSub}`);
    const data = await response.json();
    
    // Fallback if the API returns an error structure or empty URL
    if (!data || !data.url) {
        throw new Error("Invalid data received");
    }

    return new EmbedBuilder()
        .setTitle(data.title || "Here is your meme!")
        .setURL(data.postLink || "https://reddit.com")
        .setImage(data.url)
        .setColor('#FF4500')
        .setFooter({ text: `👍 ${data.ups || 0} | Subreddit: r/${data.subreddit || randomSub}` });
}

module.exports = {
    name: 'meme',
    description: 'Fetch a random meme from popular subreddits.',
    data: new SlashCommandBuilder()
        .setName('meme')
        .setDescription('Fetch a random meme from popular subreddits.'),
    
    // 🛑 SLASH COMMAND HANDLER
    async execute(interaction) {
        if ((await database.get(`fun_enabled_${interaction.guild.id}`)) === 'disabled') {
            return interaction.reply({ content: '❌ The Fun Module is currently disabled.', ephemeral: true });
        }
        await interaction.deferReply();
        try {
            const embed = await getMemeEmbed();
            return interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            return interaction.editReply('❌ Couldn\'t grab a fresh meme right now. Try again!');
        }
    },

    // 🛑 PREFIX COMMAND HANDLER
    async executePrefix(message) {
        if ((await database.get(`fun_enabled_${message.guild.id}`)) === 'disabled') {
            return message.reply('❌ The Fun Module is currently disabled on this server.');
        }
        try {
            const embed = await getMemeEmbed();
            await message.channel.send({ embeds: [embed] });
        } catch (error) {
            console.error(error);
            await message.channel.send('❌ Couldn\'t grab a fresh meme right now. Try again!');
        }
    }
};
