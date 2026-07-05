const { SlashCommandBuilder } = require('discord.js');
const database = require('../utils/database.js');

const fortunes = [
    "A legendary gaming session is near.",
    "Beware of typos in your next config update.",
    "Great fortune awaits you if you ignore the next bad pun.",
    "An old friend will message you out of the blue with a strange proposition.",
    "You will soon find something you thought was lost forever.",
    "A major victory is coming your way in an unexpected competitive setting.",
    "The next code you copy-paste will actually work flawlessly on the first try.",
    "Do not trust the vending machine tomorrow; it has eyes.",
    "Your creative energy is peaking; pick up that project you abandoned months ago.",
    "Someone on this server is thinking highly of you right now.",
    "Your luck will drastically shift for the better when the moon enters its next phase.",
    "An unexpected gift will arrive shortly, bringing immense joy.",
    "A great opportunity is hidden behind a minor inconvenience you will encounter tomorrow.",
    "Your storage space is running low, but your spiritual capacity is completely full.",
    "Rest up; you will need your energy for an epic adventure coming this weekend.",
    "A mystery person will soon provide the answers you’ve been looking for.",
    "Avoid making major decisions while your phone battery is below 15%.",
    "Your hard work will finally catch the eye of someone who matters.",
    "Adventure is right around the corner. Make sure you leave your comfort zone.",
    "A clear path will soon reveal itself through the chaos of your current situation.",
    "The next song you hear on shuffle will perfectly describe your upcoming week.",
    "A token of appreciation is heading your way from an unexpected source.",
    "Trust your gut today; your instincts are operating at 100% capacity.",
    "You will soon conquer a minor fear that has been holding you back.",
    "Be patient. The best things in life take time, much like a massive game update."
];

module.exports = {
    name: 'fortune',
    description: 'Reveals a massive pool prediction about your future.',
    data: new SlashCommandBuilder().setName('fortune').setDescription('Reveals a prediction about your future.'),
    
    async execute(interaction) {
        if ((await database.get(`fun_enabled_${interaction.guild.id}`)) === 'disabled') return interaction.reply({ content: '❌ Disabled.', ephemeral: true });
        await interaction.reply(`🔮 **Your Fortune:** ${fortunes[Math.floor(Math.random() * fortunes.length)]}`);
    },
    async executePrefix(message) {
        if ((await database.get(`fun_enabled_${message.guild.id}`)) === 'disabled') return;
        await message.channel.send(`🔮 **Your Fortune:** ${fortunes[Math.floor(Math.random() * fortunes.length)]}`);
    }
};
