const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const { readData } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mydata')
    .setDescription('Developer Only: Download raw saved JSON data files as files'),

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
      // Safely parse command arguments 
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

      // Read the data from your local file system
      const rawData = readData(fileName) || {};
      
      // Convert the JSON object to a cleanly spaced string
      const jsonString = JSON.stringify(rawData, null, 2);

      // Convert the string into a temporary memory Buffer for Discord attachments
      const buffer = Buffer.from(jsonString, 'utf-8');
      const fileAttachment = new AttachmentBuilder(buffer, { name: `raw_${fileName}` });

      const outputMessage = `📊 **Live Cloud Storage File: \`${fileName}\`**\nHere is your full database backup requested below:`;

      if (isInteraction) {
        await context.reply({ content: outputMessage, files: [fileAttachment], ephemeral: true });
      } else {
        await context.reply({ content: outputMessage, files: [fileAttachment] });
      }
    } catch (error) {
      console.error(error);
      const msg = `❌ Error building database text file: ${error.message}`;
      if (isInteraction) await context.reply({ content: msg, ephemeral: true });
      else await context.reply(msg);
    }
  }
};
