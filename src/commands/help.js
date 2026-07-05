const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { readData } = require('../utils/database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('View all available commands and the bot prefix'),

  async execute(context) {
    const isInteraction = !!context.isChatInputCommand;
    const guildId = context.guildId;
    const client = context.client;

    try {
      const cuteData = readData('cute.json') || {};
      const cuteStyle = cuteData[guildId] || 'off';
      const isCute = cuteStyle !== 'off';

      const prefix = client.prefix || '|';

      const publicCommands = [
        { name: '/help',                    desc: 'View this help menu layout.' },
        { name: '/purpose',                 desc: 'Learn about the bot and see its profile picture.' },
        { name: '/fun-menu',                desc: 'Explore what the Fun Module is and view its available commands.' }, // Cleanly Added here
        { name: '/rank',                    desc: 'Check your level and XP progress.' },
        { name: '/leaderboard',             desc: 'View top 10 users by level.' },
        { name: '/ticket',                  desc: 'Create a private support ticket for help.' },
        { name: '/joke',                    desc: 'Get a clean, funny joke.' },
        { name: '/fortune',                 desc: 'Reveals a prediction about your future.' },
        { name: '/spacefact',               desc: 'Get a mind-blowing cosmic space fact.' },
        { name: '/cat',                     desc: 'Fetch a random cute cat picture.' },
        { name: '/dog',                     desc: 'Fetch a random cute dog picture.' },
        { name: '/trivia',                  desc: 'Spits out a random brain-teaser trivia question.' },
        { name: '/hug <user>',              desc: 'Give a member a warm, fuzzy virtual hug.' },
        { name: '/slap <user>',             desc: 'Slap another user with a giant, smelly yellow trout.' },
        { name: '/dice-duel <opponent>',    desc: 'Challenge another user to an instant dice rolling duel.' },
        { name: '/wouldyourather',          desc: 'Presents an impossible Choice A or Choice B split decision.' },
        { name: '/capital-quiz',            desc: 'Tests your geographic knowledge of world capitals.' },
        { name: '/predict-love <a, b>',     desc: 'Calculate the compatibility percentage between two items.' }
      ];

      const staffCommands = [
        { name: '/setup',             desc: 'Set up server templates (Gaming/Community/Study/Business).' },
        { name: '/clear-channels',    desc: '🗑️ Wipes all categories and channels from the server.' },
        { name: '/welcome',           desc: 'Configure or toggle the welcome/leave notification system.' },
        { name: '/leveling',          desc: 'Manage system settings for tracking server leveling.' },
        { name: '/fun-module',        desc: 'Toggle the fun module commands configuration on or off.' },
        { name: '/mod-logs-toggle',   desc: 'Log all moderator actions in one channel.' },
        { name: '/ban',               desc: 'Ban a user from the server.' },
        { name: '/kick',              desc: 'Kick a user from the server.' },
        { name: '/mute',              desc: 'Mute a user for a set duration.' },
        { name: '/unmute',            desc: 'Unmute a muted user.' },
        { name: '/warn',              desc: 'Issue a formal warning to a user.' },
        { name: '/warnings',          desc: 'View current warnings for a specific user.' },
        { name: '/cute',              desc: 'Toggle or configure cute text formatting styles.' }
      ];

      const roleCommands = [
        { name: `${prefix}role user @member @role`,                          desc: 'Add a role to a specific user.' },
        { name: `${prefix}role remove @member @role`,                        desc: 'Remove a role from a specific user.' },
        { name: `${prefix}role create <name> [color] [hoist] [mentionable]`, desc: 'Create a new role.' },
        { name: `${prefix}role delete @role`,                                desc: 'Delete an existing role.' },
        { name: `${prefix}role everyone @role`,                              desc: 'Give a role to every member.' },
        { name: `${prefix}role bots @role`,                                  desc: 'Give a role to all bots.' },
        { name: `${prefix}role humans @role`,                                desc: 'Give a role to all non-bot members.' },
        { name: `${prefix}role info @role`,                                  desc: 'Display info about a role.' },
        { name: `${prefix}role list`,                                        desc: 'List all roles in the server.' },
        { name: `${prefix}role color @role #hex`,                            desc: "Change a role's color." },
        { name: `${prefix}role rename @role <new name>`,                      desc: 'Rename an existing role.' },
        { name: `${prefix}role hoist @role`,                                 desc: 'Toggle whether a role is shown separately in the member list.' },
        { name: `${prefix}role mentionable @role`,                           desc: 'Toggle whether a role can be mentioned.' }
      ];

      const embed = new EmbedBuilder()
        .setColor(isCute ? '#FF69B4' : '#0099FF')
        .setTitle(isCute ? '✨ Help Menu ✨' : '📚 Help Menu')
        .setDescription(`${isCute ? '(´｀)♡ ' : ''}Prefix: \`${prefix}\`${isCute ? ' ♡(´｀)' : ''}`)
        .addFields(
          {
            name: isCute ? '💖 Member Commands' : '⚙️ Member Commands',
            value: publicCommands.map(c => `\`${c.name}\` - ${c.desc}`).join('\n')
          },
          {
            name: isCute ? '🔒 Staff Commands (Staff Only)' : '🛠️ Staff Commands (Staff Only)',
            value: staffCommands.map(c => `\`${c.name}\` - ${c.desc}`).join('\n')
          },
          {
            name: isCute ? '👑 Role Management (Staff Only)' : '🎭 Role Management (Staff Only)',
            value: roleCommands.map(c => `\`${c.name}\` - ${c.desc}`).join('\n')
          },
          {
            name: isCute ? '💕 Prefix Usage' : '📝 Prefix Usage',
            value: `Use \`${prefix}commandname\` to execute commands via prefix\nExample: \`${prefix}fun-menu\``
          }
        )
        .setFooter({ text: isCute ? '✨ Made with love ✨' : 'Use /help for more info' });

      await context.reply({ embeds: [embed] });
    } catch (error) {
      console.error('Help error:', error);
      const errMsg = `❌ Error: ${error.message}`;

      if (isInteraction) {
        if (context.replied || context.deferred) {
          await context.followUp({ content: errMsg, ephemeral: true });
        } else {
          await context.reply({ content: errMsg, ephemeral: true });
        }
      } else {
        await context.reply({ content: errMsg });
      }
    }
  }
};