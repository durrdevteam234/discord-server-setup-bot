const { SlashCommandBuilder } = require('discord.js');
const db = require('../utils/database');

const JOKES = [
  "Why do programmers wear glasses? Because they can't C#!",
  "There are 10 types of people in this world: those who understand binary, and those who don't.",
  "How many programmers does it take to change a light bulb? None, that's a hardware problem.",
  "A SQL query goes into a bar, walks up to two tables and asks, 'Can I join you?'",
  "['hip', 'hip'] (hip hip array!)",
  "Why did the programmer quit his job? Because he didn't get arrays.",
  "To understand what recursion is, you must first understand what recursion is.",
  "There are two ways to write error-free programs; only the third one works.",
  "An optimist says: 'The glass is half full.' A pessimist says: 'The glass is half empty.' A programmer says: 'The glass is twice as large as it needs to be.'",
  "A programmer's wife tells him, 'Go to the store and buy a loaf of bread. If they have eggs, buy a dozen.' He comes back with 12 loaves of bread.",
  "What is a programmer's favorite hangout place? Foo Bar.",
  "Why do Java programmers wear glasses? Because they don't C#!",
  "What's the object-oriented way to become wealthy? Inheritance.",
  "Why was the JavaScript developer sad? Because he didn't know how to 'Null' his feelings."
];

module.exports = {
  data: new SlashCommandBuilder().setName('joke').setDescription('Get a massive, hilarious developer joke.'),
  name: 'joke',
  async execute(interaction) {
    const settings = db.readData('settings.json') || {};
    if (interaction.guild && settings[interaction.guild.id]?.funModule !== 'on') {
      return interaction.reply({ content: '❌ The Fun Module is currently disabled on this server!', ephemeral: true });
    }
    const randomJoke = JOKES[Math.floor(Math.random() * JOKES.length)];
    await interaction.reply(randomJoke);
  }
};