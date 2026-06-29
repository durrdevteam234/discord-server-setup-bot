const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const mongoose = require('mongoose');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mydata')
    .setDescription('Developer Only: Download raw saved MongoDB data as JSON files')
    .addStringOption(option =>
      option.setName('collection')
        .setDescription('The specific database collection to download')
        .setRequired(false)
    ),

  async runPrefix(message, args = []) {
    // Standardizes the prefix arguments array structure
    await this.execute(message, args);
  },

  async execute(context, args = []) {
    const isInteraction = !!context.isChatInputCommand;
    const authorId = isInteraction ? context.user.id : context.author.id;

    // 🔒 SECURITY GATE: Preserved your owner ID safely
    const OWNER_ID = '889540845269823559'; 

    if (authorId !== OWNER_ID) {
      const msg = '❌ This command can only be used by the Bot Owner!';
      return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
    }

    try {
      // 1. Check if MongoDB is actually connected
      if (mongoose.connection.readyState !== 1) {
          const msg = '❌ The database connection is currently offline!';
          return isInteraction ? context.reply({ content: msg, ephemeral: true }) : context.reply(msg);
      }

      const db = mongoose.connection.db;

      // 2. Parse command arguments to find out what target collection the user wants
      let targetCollection = '';
      if (isInteraction) {
        targetCollection = context.options.getString('collection') || '';
      } else {
        targetCollection = Array.isArray(args) ? args[0] : args;
      }

      let dataPayload = {};
      let downloadFileName = 'all_database_collections.json';

      // 3. If a specific collection is named, fetch only that collection. Otherwise, fetch everything.
      if (targetCollection) {
        targetCollection = targetCollection.toLowerCase();
        const documents = await db.collection(targetCollection).find().toArray();
        dataPayload[targetCollection] = documents;
        downloadFileName = `${targetCollection}_backup.json`;
      } else {
        // Fetch every single collection in your cluster database
        const collections = await db.listCollections().toArray();
        for (const col of collections) {
          dataPayload[col.name] = await db.collection(col.name).find().toArray();
        }
      }

      // 4. Convert the MongoDB data documents into a cleanly spaced text string
      const jsonString = JSON.stringify(dataPayload, null, 2);

      // 5. Convert the string into a memory Buffer for Discord attachments (removes local file writing entirely)
      const buffer = Buffer.from(jsonString, 'utf-8');
      const fileAttachment = new AttachmentBuilder(buffer, { name: downloadFileName });

      const outputMessage = `📊 **Live MongoDB Atlas Export: \`${downloadFileName}\`**\nHere is your real-time database backup file:`;

      if (isInteraction) {
        await context.reply({ content: outputMessage, files: [fileAttachment], ephemeral: true });
      } else {
        await context.reply({ content: outputMessage, files: [fileAttachment] });
      }
    } catch (error) {
      console.error('[DATABASE EXPORT CRASH]', error);
      const msg = `❌ Error building database backup file: ${error.message}`;
      if (isInteraction) await context.reply({ content: msg, ephemeral: true });
      else await context.reply(msg);
    }
  }
};
