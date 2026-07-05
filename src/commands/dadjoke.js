const { SlashCommandBuilder } = require('discord.js');
const db = require('../utils/database');

const DAD_JOKES = [
  "I'm reading a book on anti-gravity. I just can't put it down!",
  "I told my doctor that I broke my arm in two places. He told me to stop going to those places.",
  "Why do fathers take an extra pair of pants when they go golfing? In case they get a hole in one!",
  "What do you call a factory that makes okay products? A satisfactory.",
  "Why did the scarecrow win an award? Because he was outstanding in his field!",
  "What do you call someone with no body and no nose? Nobody knows.",
  "Why don't scientists trust atoms? Because they make up everything!",
  "Did you hear about the guy who invented the knock-knock joke? He won the 'no-bell' prize.",
  "I used to play piano by ear, but now I use my hands.",
  "How do you make a tissue dance? You put a little boogie in it.",
  "What do you call a fake noodle? An impasta.",
  "Why did the bicycle fall over? Because it was two-tired.",
  "Want to hear a joke about construction? I'm still working on it.",
  "What do you call a sleeping dinosaur? A dino-snore!"
];

module.exports = {
  data: new SlashCommandBuilder().setName('dadjoke').setDescription('Get a classic, groans-guaranteed dad joke.'),
  name: 'dadjoke',
  async execute(interaction) {
    const settings = db.readData('settings.json') || {};
    if (interaction.guild && settings[interaction.guild.id]?.funModule !== 'on') {
      return interaction.reply({ content: '❌ The Fun Module is currently disabled on this server!', ephemeral: true });
    }
    const randomDadJoke = DAD_JOKES[Math.floor(Math.random() * DAD_JOKES.length)];
    await interaction.reply(randomDadJoke);
  }
};