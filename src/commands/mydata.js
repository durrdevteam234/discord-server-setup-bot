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
  name: 'mydata',

  async execute(interaction, client) {
    const isInteraction = interaction.isCommand ? interaction.isCommand() : false;
    const authorId = interaction.user ? interaction.user.id : interaction.author.id;

    // 🔒 SECURITY GATE: Preserved your owner ID safely
    const OWNER_ID = '889540845269823559'; 

    if (authorId !== OWNER_ID) {
      const msg = '❌ This command can only be used by the Bot Owner!';
      return interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
    }

    try {
      // 1. Check if MongoDB is actually connected
      if (mongoose.connection.readyState !== 1) {
          const msg = '❌ The database connection is currently offline!';
          return interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
      }

      const db = mongoose.connection.db;

      // 2. Parse command arguments to find out what target collection the user wants
      let targetCollection = '';
      if (isInteraction) {
        targetCollection = interaction.options.getString('collection') || '';
      } else {
        targetCollection = typeof interaction.options.getString === 'function'
          ? interaction.options.getString('collection') || ''
          : interaction.options.getString || '';
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

      return interaction.reply({ content: outputMessage, files: [fileAttachment] });
    } catch (error) {
      console.error('[DATABASE EXPORT CRASH]', error);
      const msg = `❌ Error building database backup file: ${error.message}`;
      return interaction.reply({ content: msg, ephemeral: true }).catch(() => null);
    }
  },

  // Prefix translation pipeline routing back to main execute framework
  async executePrefix(message, argsArray, client) {
    // 🔒 Owner Permission Check right at the prefix level
    const OWNER_ID = '889540845269823559';
    if (message.author.id !== OWNER_ID) {
      return message.reply('❌ This command can only be used by the Bot Owner!').catch(() => null);
    }

    const inputArg = argsArray && argsArray[0] ? argsArray[0].toLowerCase().trim() : '';

    const mockInteraction = {
      guild: message.guild,
      guildId: message.guild?.id,
      member: message.member,
      user: message.author,
      author: message.author,
      options: {
        getString: inputArg
      },
      reply: async (options) => message.reply(options)
    };

    await this.execute(mockInteraction, client).catch(err => console.error('Error handling mydata backup prefix wrapper:', err));
  }
};
