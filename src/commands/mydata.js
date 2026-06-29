const { SlashCommandBuilder } = require('discord.js');
const { readData } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mydata')
    .setDescription('Developer Only: View raw saved JSON data files'),

  // This handles the |mydata prefix command directly
  async runPrefix(message, args = []) {
    await this.execute(message, args);
  },

  async execute(context, args = []) {
    const isInteraction = !!context.isChatInputCommand;
    const authorId = isInteraction ? context.user.id : context.author.id;

    // 🔒 SECURITY GATE: Put your Discord User ID here (numbers only inside quotes)
    const OWNER_ID = '889540845269823559'; 

    if (authorId !== OWNER_ID) {
      const msg = '❌ This command can only be used by the Bot Owner!';
      return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
    }

    try {
      // Safely parse argument whether it's an array or string
      let choice = '';
      if (isInteraction) {
        choice = context.options.getString('file') || '';
      } else {
        choice = Array.isArray(args) ? args[0] : args;
      }
      
      let fileName = 'levels.json';
      choice = choice?.toLowerCase();
      
      if (choice === 'settings') fileName = 'settings.json';
      if (choice === 'mutes') fileName = 'mutes.json';
      if (choice === 'leveling') fileName = 'leveling_settings.json';

      const rawData = readData(fileName) || {};
      const jsonString = JSON.stringify(rawData, null, 2);

      const safeString = jsonString.length > 1900 
        ? jsonString.substring(0, 1900) + '\n... (truncated due to length)'
        : jsonString;

      const output = `📊 **Raw Cloud Data Storage: \`${fileName}\`**\n\`\`\`json\n${safeString}\n\`\`\``;

      if (isInteraction) {
        await context.reply({ content: output, ephemeral: true });
      } else {
        await context.reply(output);
      }
    } catch (error) {
      console.error(error);
      const msg = `❌ Error pulling cloud data: ${error.message}`;
      if (isInteraction) await context.reply({ content: msg, ephemeral: true });
      else await context.reply(msg);
    }
  }
};
