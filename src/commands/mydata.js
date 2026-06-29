const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mydata')
    .setDescription('Developer Only: View raw saved JSON data files'),

  async execute(context, args = []) {
    const isInteraction = !!context.isChatInputCommand;
    const authorId = isInteraction ? context.user.id : context.author.id;

    // 🔒 SECURITY GATE: Replace this string with YOUR personal Discord User ID
    const OWNER_ID = '889540845269823559'; 

    if (authorId !== OWNER_ID) {
      const msg = '❌ This command can only be used by the Bot Owner!';
      return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
    }

    try {
      // Pick which file you want to view based on arguments (Default: levels.json)
      let fileName = 'levels.json';
      const inputArg = isInteraction ? context.options.getString('file') : args[0];
      
      if (inputArg === 'settings') fileName = 'settings.json';
      if (inputArg === 'mutes') fileName = 'mutes.json';
      if (inputArg === 'leveling') fileName = 'leveling_settings.json';

      const rawData = readData(fileName) || {};
      
      // Convert the JSON object to a clean string format
      const jsonString = JSON.stringify(rawData, null, 2);

      // If the data is massive, truncate it to fit inside Discord's 2000 character limit
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

