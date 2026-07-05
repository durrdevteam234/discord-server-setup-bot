const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database.js');

module.exports = {
    name: 'fun-menu',
    description: 'Explore what the Fun Module is and view its available commands.',
    data: new SlashCommandBuilder()
        .setName('fun-menu')
        .setDescription('Explore what the Fun Module is and view its available commands.'),

    async execute(interaction) {
        const currentStatus = (await database.get(`fun_enabled_${interaction.guild.id}`)) || 'enabled';
        
        const embed = new EmbedBuilder()
            .setTitle('🎯 Interactive Fun Module')
            .setDescription(`Welcome to the server's entertainment hub! This module packs mini-games, random generators, trivia, and community actions to keep the chat active and vibrant.\n\n🟢 Current Status: **${currentStatus.toUpperCase()}**`)
            .setColor('#9B59B6')
            .addFields(
                { 
                    name: '🎲 Games & Quizzes', 
                    value: '• `/trivia` - Spits out a random brain-teaser trivia question.\n• `/capital-quiz` - Tests your geographic knowledge of world capitals.\n• `/dice-duel` - Challenge another user to an instant randomized dice duel.\n• `/wouldyourather` - Presents an impossible split decision prompt.' 
                },
                { 
                    name: '✨ Media & Fun Facts', 
                    value: '• `/cat` - Fetch a random cute cat picture from Reddit.\n• `/dog` - Fetch a random cute dog or puppy picture from Reddit.\n• `/joke` - Get a clean, funny joke from a massive database.\n• `/spacefact` - Get a mind-blowing cosmic space fact.\n• `/fortune` - Reveals a prediction about your future.' 
                },
                { 
                    name: '💞 Community Interactions', 
                    value: '• `/hug <user>` - Give a member a warm, fuzzy virtual hug.\n• `/slap <user>` - Slap another user with a giant, smelly yellow trout.\n• `/predict-love <a, b>` - Calculate compatibility percentage between two items.' 
                }
            )
            .setFooter({ text: 'Use any command above to get started!' });

        await interaction.reply({ embeds: [embed] });
    },

    async executePrefix(message) {
        const currentStatus = (await database.get(`fun_enabled_${message.guild.id}`)) || 'enabled';

        const embed = new EmbedBuilder()
            .setTitle('🎯 Interactive Fun Module')
            .setDescription(`Welcome to the server's entertainment hub! This module packs mini-games, random generators, trivia, and community actions.\n\n🟢 Current Status: **${currentStatus.toUpperCase()}**`)
            .setColor('#9B59B6')
            .addFields(
                { 
                    name: '🎲 Games & Quizzes', 
                    value: '• `|trivia` - Spits out a random brain-teaser trivia question.\n• `|capital-quiz` - Tests your geographic knowledge of world capitals.\n• `|dice-duel @user` - Challenge another user to a dice duel.\n• `|wouldyourather` - Presents an impossible split decision prompt.' 
                },
                { 
                    name: '✨ Media & Fun Facts', 
                    value: '• `|cat` - Fetch a random cute cat picture.\n• `|dog` - Fetch a random cute dog picture.\n• `|joke` - Get a clean, funny joke.\n• `|spacefact` - Get a mind-blowing cosmic space fact.\n• `|fortune` - Reveals a prediction about your future.' 
                },
                { 
                    name: '💞 Community Interactions', 
                    value: '• `|hug @user` - Give a member a warm virtual hug.\n• `|slap @user` - Slap another user with a giant yellow trout.\n• `|predict-love item1, item2` - Calculate compatibility between two items.' 
                }
            );

        await message.channel.send({ embeds: [embed] });
    }
};