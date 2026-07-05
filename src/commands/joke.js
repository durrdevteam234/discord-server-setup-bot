const { SlashCommandBuilder } = require('discord.js');
const database = require('../utils/database.js');

// A massive, diverse collection of clean jokes
const jokes = [
    "What do you call a fake noodle? An imposter.",
    "Why did the scarecrow win an award? Because he was outstanding in his field!",
    "Parallel lines have so much in common. It’s a shame they’ll never meet.",
    "Why don't scientists trust atoms? Because they make up everything!",
    "What do you call a factory that makes okay products? A satisfactory.",
    "Why did the bicycle fall over? Because it was two-tired!",
    "What do you call an alligator in a vest? An investigator.",
    "Why don't skeletons fight each other? They don't have the guts.",
    "Why did the math book look sad? Because it had too many problems.",
    "What do you call a sleeping dinosaur? A dino-snore!",
    "Why did the stadium get hot after the game? All of the fans left.",
    "Why did the computer go to the doctor? It had a virus!",
    "What do you call a belt made out of watches? A waist of time.",
    "Why can't a nose be 12 inches long? Because then it would be a foot.",
    "What do you call a cheese that isn't yours? Nacho cheese.",
    "Why do we tell actors to 'break a leg'? Because every play has a cast.",
    "How does a penguin build its house? Igloos it together.",
    "What do you call a group of unorganized cats? A meowtain.",
    "Why did the picture go to jail? Because it was framed.",
    "What do you call a programmer from Finland? Nerdic.",
    "Why do Java developers wear glasses? Because they don't C#.",
    "How many programmers does it take to change a light bulb? None, that's a hardware problem.",
    "There are 10 types of people in the world: those who understand binary, and those who don't.",
    "Why was the cell phone wearing glasses? It lost its contacts.",
    "What is a tree's favorite radio station? Anything that plays heavy root music.",
    "What do you call a shoe made out of a banana? A slipper.",
    "Why did the coffee file a police report? It got mugged.",
    "What do you call an elephant that doesn't matter? An irrelephant.",
    "Why did the golfer bring two pairs of pants? In case he got a hole in one.",
    "What kind of car does Jesus drive? A Christler.",
    "Why don't oysters share their pearls? Because they're shellfish.",
    "What do you call a bear with no teeth? A gummy bear.",
    "Why did the tomato blush? Because it saw the salad dressing.",
    "What do you call a ghost's true love? His ghoul-friend.",
    "Why did the strawberry cry? Because its parents were in a jam.",
    "What do you call a musician who leaks secrets? A whistle-blower.",
    "Why do seagulls fly over the ocean? Because if they flew over the bay, they’d be bagels.",
    "What do you call a computer that sings? A Dell.",
    "Why did the skeleton go to the party alone? He had no-body to go with.",
    "What do you call a magic dog? A Labracadabrador.",
    "Why do cows wear bells? Because their horns don't work.",
    "What do you call a line of men waiting to get haircuts? A barbecue.",
    "Why did the cookie go to the hospital? Because it felt crummy.",
    "What do you call a pencil with two erasers? Pointless.",
    "Why did the bee get married? Because he found his honey.",
    "What do you call a fake stone in Ireland? A sham-rock.",
    "Why are elevator jokes so classic? Because they work on so many levels.",
    "What do you call a pig that knows karate? A pork chop.",
    "Why did the run-away banana wear sunscreen? Because it was peeling.",
    "What do you call a pile of kittens? A meowntain.",
    "Why can’t you give Elsa a balloon? Because she will let it go."
];

module.exports = {
    name: 'joke',
    description: 'Get a clean, funny joke from a massive collection.',
    data: new SlashCommandBuilder()
        .setName('joke')
        .setDescription('Get a clean, funny joke from a massive collection.'),
        
    // 🛑 SLASH COMMAND HANDLER
    async execute(interaction) {
        if ((await database.get(`fun_enabled_${interaction.guild.id}`)) === 'disabled') {
            return interaction.reply({ content: '❌ The Fun Module is currently disabled.', ephemeral: true });
        }
        
        const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
        await interaction.reply(`😂 ${randomJoke}`);
    },

    // 🛑 PREFIX COMMAND HANDLER
    async executePrefix(message) {
        if ((await database.get(`fun_enabled_${message.guild.id}`)) === 'disabled') {
            return message.reply('❌ The Fun Module is currently disabled on this server.');
        }
        
        const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
        await message.channel.send(`😂 ${randomJoke}`);
    }
};
