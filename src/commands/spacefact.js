const { SlashCommandBuilder } = require('discord.js');
const database = require('../utils/database.js');

const spaceFacts = [
    "One day on Venus is longer than one entire year on Venus.",
    "Space is completely silent because there is no atmosphere for sound to travel through.",
    "Neutron stars are so dense, a single teaspoon of their material weighs 6 billion tons.",
    "One million Earths could fit inside the Sun.",
    "There are more trees on Earth than stars in the Milky Way galaxy.",
    "Sunset on Mars appears completely blue to the naked eye.",
    "Footprints left by astronauts on the Moon will probably stay there for at least 100 million years.",
    "The planet Uranus spins on its side, completely unique to our solar system.",
    "In space, liquid water will instantly boil and then immediately freeze into crystals.",
    "There is a giant cloud of alcohol floating in the constellation Aquila that contains enough beer to fill 400 trillion pints.",
    "Because of gravitational time dilation, a clock in space ticks slightly faster than a clock on Earth.",
    "Saturn’s rings are not solid; they are made up of billions of pieces of ice, rock, and dust.",
    "The closest star system to us, Alpha Centauri, is roughly 4.37 light-years away.",
    "Space junk is a massive issue; there are millions of pieces of debris orbiting Earth right now at speeds up to 17,500 mph.",
    "Light from the Sun takes exactly 8 minutes and 20 seconds to travel to Earth.",
    "If two pieces of the same type of metal touch in space, they will permanently bond together via cold welding.",
    "The Milky Way galaxy is on a crash course with the neighboring Andromeda galaxy in about 4.5 billion years.",
    "Jupiter’s Great Red Spot is a raging storm that has been spinning for at least 350 years and is bigger than Earth.",
    "Olympus Mons on Mars is the tallest volcano in the solar system, measuring three times the height of Mount Everest.",
    "A full NASA space suit costs roughly $12 million to build.",
    "Gargantua-level black holes compress space-time so violently that light itself cannot escape their event horizon."
];

module.exports = {
    name: 'spacefact',
    description: 'Get a mind-blowing cosmic space fact.',
    data: new SlashCommandBuilder().setName('spacefact').setDescription('Get a mind-blowing cosmic space fact.'),
    
    async execute(interaction) {
        if ((await database.get(`fun_enabled_${interaction.guild.id}`)) === 'disabled') return interaction.reply({ content: '❌ Disabled.', ephemeral: true });
        await interaction.reply(`🚀 **Space Fact:** ${spaceFacts[Math.floor(Math.random() * spaceFacts.length)]}`);
    },
    async executePrefix(message) {
        if ((await database.get(`fun_enabled_${message.guild.id}`)) === 'disabled') return;
        await message.channel.send(`🚀 **Space Fact:** ${spaceFacts[Math.floor(Math.random() * spaceFacts.length)]}`);
    }
};
