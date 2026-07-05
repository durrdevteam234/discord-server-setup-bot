const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database.js');

async function getDogEmbed() {
    const subs = ['dogpictures', 'puppies'];
    const randomSub = subs[Math.floor(Math.random() * subs.length)];
    const response = await fetch(`https://meme-api.com/gimme/${randomSub}`);
    const data = await response.json();
    
    if (!data || !data.url) throw new Error("Invalid data received");

    return new EmbedBuilder()
        .setTitle(data.title || "🐶 Woof! Look at this cute puppy!")
        .setURL(data.postLink || "https://reddit.com")
        .setImage(data.url)
        .setColor('#DEB887')
        .setFooter({ text: `Subreddit: r/${data.subreddit}` });
}

module.exports = {
    name: 'dog',
    description: 'Fetch a random cute dog picture.',
    data: new SlashCommandBuilder().setName('dog').setDescription('Fetch a random cute dog picture.'),
    
    async execute(interaction) {
        if ((await database.get(`fun_enabled_${interaction.guild.id}`)) === 'disabled') {
            return interaction.reply({ content: '❌ The Fun Module is currently disabled.', ephemeral: true });
        }
        await interaction.deferReply();
        try {
            const embed = await getDogEmbed();
            return interaction.editReply({ embeds: [embed] });
        } catch {
            return interaction.editReply('❌ Couldn\'t grab a puppy picture right now.');
        }
    },
    async executePrefix(message) {
        if ((await database.get(`fun_enabled_${message.guild.id}`)) === 'disabled') return message.reply('❌ Disabled.');
        try {
            const embed = await getDogEmbed();
            await message.channel.send({ embeds: [embed] });
        } catch {
            await message.channel.send('❌ Couldn\'t grab a puppy picture right now.');
        }
    }
};
