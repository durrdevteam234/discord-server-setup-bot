const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const db = require('../utils/database');

// Expanded pool featuring 30 classic programmer and developer jokes
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
  "Why was the JavaScript developer sad? Because he didn't know how to 'Null' his feelings.",
  "Why do programmers prefer dark mode? Because light attracts bugs!",
  "What do you call a programmer from Finland? Nerdic.",
  "How many programmers does it take to kill a cockroach? Two. One to hold it down, and one to install Windows 95 on it.",
  "A programmer walks into a butcher shop and buys a pound of meat. He complains: 'Wait, why is this only 453 grams? I wanted a real pound (512g)!'",
  "There are two hard things in computer science: cache invalidation, naming things, and off-by-one errors.",
  "What is a ghost's favorite data type? A Boo-lean.",
  "Why did the database administrator leave his wife? She had too many foreign keys.",
  "A QA engineer walks into a bar. Orders a beer. Orders 0 beers. Orders 999999999 beers. Orders a lizard. Orders -1 beers. Orders a ueicbwiuqiunc.",
  "What do computers and air conditioners have in common? They both stop working properly when you open Windows.",
  "Why was the developer broke? Because he used up all his cache.",
  "What is the best thing about Boolean logic? Even if you are wrong, you are only off by a bit.",
  "Why did the private classes break up? They just couldn't access each other's members.",
  "Knock knock. 'Who's there?' *Very long pause...* 'Java.'",
  "Why did the HTML file break up with the CSS file? Because it felt like it was being too controlled.",
  "An infinite loop walks into a bar... An infinite loop walks into a bar... An infinite loop walks into a bar...",
  "How do you tell an introverted programmer from an extroverted programmer? An extroverted programmer looks at *your* shoes when they talk to you."
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('joke')
    .setDescription('Get a massive, hilarious developer joke.'),
  name: 'joke',

  async execute(interaction) {
    const settings = db.readData('settings.json') || {};
    const currentGuildSettings = settings[interaction.guildId] || {};

    // Standard structural safety framework filter matching boolean configurations
    if (currentGuildSettings.funModule === 'disabled' || currentGuildSettings.funModule === false) {
      return interaction.reply({ 
        content: '❌ The Fun Module is currently disabled on this server!', 
        flags: [MessageFlags.Ephemeral] 
      }).catch(() => null);
    }
    
    const randomJoke = JOKES[Math.floor(Math.random() * JOKES.length)];
    
    let cuteStyle = 'off';
    try { const cuteData = db.readData('cute.json') || {}; cuteStyle = cuteData[interaction.guildId] || 'off'; } catch (e) {}
    const isCuteActive = cuteStyle !== 'off';

    const embed = new EmbedBuilder()
      .setColor(isCuteActive ? '#FF69B4' : '#1ABC9C')
      .setTitle(isCuteActive ? '✨ 💻 DEV HUMOR ✨' : '💻 Developer Joke')
      .setDescription(`\`\`\`js\n${randomJoke}\`\`\``)
      .setFooter({ text: 'Status: 200 OK' });
      
    await interaction.reply({ embeds: [embed] }).catch(() => null);
  },

  async executePrefix(message, args, client) {
    const settings = db.readData('settings.json') || {};
    const currentGuildSettings = settings[message.guild?.id] || {};

    if (currentGuildSettings.funModule === 'disabled' || currentGuildSettings.funModule === false) {
      return message.reply('❌ The complete **Fun Command Suite** has been globally disabled by a server administrator.').catch(() => null);
    }

    const randomJoke = JOKES[Math.floor(Math.random() * JOKES.length)];
    
    let cuteStyle = 'off';
    try { const cuteData = db.readData('cute.json') || {}; cuteStyle = cuteData[message.guild?.id] || 'off'; } catch (e) {}
    const isCuteActive = cuteStyle !== 'off';

    const embed = new EmbedBuilder()
      .setColor(isCuteActive ? '#FF69B4' : '#1ABC9C')
      .setTitle(isCuteActive ? '✨ 💻 DEV HUMOR ✨' : '💻 Developer Joke')
      .setDescription(`\`\`\`js\n${randomJoke}\`\`\``)
      .setFooter({ text: 'Status: 200 OK' });
      
    await message.reply({ embeds: [embed] }).catch(() => null);
  }
};
