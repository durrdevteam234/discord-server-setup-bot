const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../utils/database');

const FACTS = [
  "One day on Venus is longer than one entire year on Venus.",
  "Neutron stars are so dense, a single teaspoon of their material would weigh 6 billion tons.",
  "Space is completely silent because there is no atmosphere for sound waves to travel through.",
  "Footprints left on the Moon by Apollo astronauts will stay there for at least 100 million years.",
  "The sun is huge, but in the cosmic scale, it's actually relatively small. One million Earths could fit inside it.",
  "There is a planet made of diamonds called 55 Cancri e, which is twice the size of Earth.",
  "Because of lower gravity, a person who weighs 100 pounds on Earth would weigh only 38 pounds on Mars.",
  "Halley's Comet won't pass by Earth again until July 2061.",
  "Our Milky Way galaxy is on a collision course with the Andromeda galaxy, but it won't happen for 4 billion years.",
  "Saturn's rings aren't solid; they are made of billions of chunks of ice, rock, and dust."
];

module.exports = {
  data: new SlashCommandBuilder().setName('spacefact').setDescription('Get a mind-blowing cosmic space fact.'),
  name: 'spacefact',
  async execute(interaction) {
    const settings = db.readData('settings.json') || {};
    if (interaction.guild && settings[interaction.guild.id]?.funModule !== 'on') {
      return interaction.reply({ content: '❌ The Fun Module is currently disabled on this server!', ephemeral: true });
    }
    const fact = FACTS[Math.floor(Math.random() * FACTS.length)];
    const embed = new EmbedBuilder().setColor('#111133').setTitle('🌌 Cosmic Space Fact').setDescription(fact);
    await interaction.reply({ embeds: [embed] });
  }
};