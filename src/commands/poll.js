const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require('discord.js');
const { Schema, model, models } = require('mongoose');

// ─────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────

const MAX_SLASH_OPTIONS = 10;
const MAX_OPTIONS = 25;
const BUTTON_THRESHOLD = 5;
const BAR_LENGTH = 14;
const BAR_FILLED = '█';
const BAR_EMPTY = '░';
const ACCENT_COLORS = [0x5865f2, 0x57f287, 0xfee75c, 0xeb459e, 0xed4245];

// ─────────────────────────────────────────────────────────────
// Models
// ─────────────────────────────────────────────────────────────

const OptionSchema = new Schema(
  {
    text: { type: String, required: true },
    voters: { type: [String], default: [] }, 
  },
  { _id: false }
);

const PollSchema = new Schema({
  messageId: { type: String, required: true, unique: true },
  channelId: { type: String, required: true },
  guildId: { type: String, required: true },
  creatorId: { type: String, required: true },
  question: { type: String, required: true },
  options: { type: [OptionSchema], required: true },
  closed: { type: Boolean, default: false },
  endsAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

const GuildSettingsSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
  allowMemberPolls: { type: Boolean, default: true },
  updatedBy: { type: String, default: null },
  updatedAt: { type: Date, default: Date.now },
});

const Poll = models.Poll || model('Poll', PollSchema);
const GuildSettings = models.GuildSettings || model('GuildSettings', GuildSettingsSchema);

// ─────────────────────────────────────────────────────────────
// Rendering helpers
// ─────────────────────────────────────────────────────────────

function colorForPoll(poll) {
  const seed = poll.messageId ? poll.messageId.charCodeAt(poll.messageId.length - 1) : 0;
  return ACCENT_COLORS[seed % ACCENT_COLORS.length];
}

function makeBar(count, total) {
  if (total === 0) return BAR_EMPTY.repeat(BAR_LENGTH);
  const filled = Math.round((count / total) * BAR_LENGTH);
  return BAR_FILLED.repeat(filled) + BAR_EMPTY.repeat(BAR_LENGTH - filled);
}

function buildPollEmbed(poll) {
  const totalVotes = poll.options.reduce((sum, o) => sum + o.voters.length, 0);

  const description = poll.options
    .map((opt, i) => {
      const count = opt.voters.length;
      const pct = totalVotes === 0 ? 0 : Math.round((count / totalVotes) * 100);
      const bar = makeBar(count, totalVotes);
      return `**${i + 1}. ${opt.text}**\n${bar}  \`${pct}%\` (${count} vote${count === 1 ? '' : 's'})`;
    })
    .join('\n\n');

  const embed = new EmbedBuilder()
    .setTitle(`📊 ${poll.question}`)
    .setDescription(description)
    .setColor(poll.closed ? 0x2b2d31 : colorForPoll(poll))
    .setFooter({
      text: poll.closed
        ? `Poll closed • ${totalVotes} total vote${totalVotes === 1 ? '' : 's'}`
        : `${totalVotes} total vote${totalVotes === 1 ? '' : 's'} • Click an option to vote`,
    })
    .setTimestamp(poll.createdAt);

  if (!poll.closed && poll.endsAt) {
    const unix = Math.floor(new Date(poll.endsAt).getTime() / 1000);
    embed.addFields({ name: 'Closes', value: `<t:${unix}:R>`, inline: true });
  }

  return embed;
}

function buildPollComponents(poll) {
  if (poll.closed) return [];

  const rows = [];

  if (poll.options.length <= BUTTON_THRESHOLD) {
    const row = new ActionRowBuilder();
    poll.options.forEach((opt, i) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`poll_vote:${poll.messageId}:${i}`)
          .setLabel(opt.text.length > 70 ? opt.text.slice(0, 67) + '...' : opt.text)
          .setStyle(ButtonStyle.Primary)
      );
    });
    rows.push(row);
  } else {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`poll_vote_select:${poll.messageId}`)
      .setPlaceholder('Choose an option to vote')
      .addOptions(
        poll.options.map((opt, i) => ({
          label: opt.text.length > 90 ? opt.text.slice(0, 87) + '...' : opt.text,
          value: String(i),
        }))
      );
    rows.push(new ActionRowBuilder().addComponents(menu));
  }

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`poll_close:${poll.messageId}`)
        .setLabel('Close Poll')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('🔒')
    )
  );

  return rows;
}
// ─────────────────────────────────────────────────────────────
// Logic Engine Core Functions
// ─────────────────────────────────────────────────────────────

async function closePoll(client, messageId) {
  const poll = await Poll.findOne({ messageId });
  if (!poll || poll.closed) return;

  poll.closed = true;
  await poll.save();

  try {
    const channel = await client.channels.fetch(poll.channelId);
    if (!channel) return;
    const msg = await channel.messages.fetch(poll.messageId);
    await msg.edit({
      embeds: [buildPollEmbed(poll)],
      components: buildPollComponents(poll),
    });
  } catch (err) {
    console.error(`Failed to update closed poll message ${messageId}:`, err.message);
  }
}

async function castVote(interaction, messageId, optionIndex) {
  const poll = await Poll.findOne({ messageId });

  if (!poll) {
    return interaction.reply({ content: '❌ This poll no longer exists.', flags: [MessageFlags.Ephemeral] });
  }
  if (poll.closed || new Date(poll.endsAt).getTime() <= Date.now()) {
    if (!poll.closed) closePoll(interaction.client, messageId).catch(() => null);
    return interaction.reply({ content: '🔒 This poll is closed.', flags: [MessageFlags.Ephemeral] });
  }
  const option = poll.options[optionIndex];
  if (!option) {
    return interaction.reply({ content: '❌ That option no longer exists.', flags: [MessageFlags.Ephemeral] });
  }

  // Atomic updates: loading the poll, editing voters and saving it back lost votes
  // when several people clicked at the same moment.
  const userId = interaction.user.id;
  const alreadyOnThisOption = option.voters.includes(userId);
  await Poll.updateOne({ messageId }, { $pull: { 'options.$[].voters': userId } });
  if (!alreadyOnThisOption) {
    await Poll.updateOne({ messageId }, { $addToSet: { [`options.${optionIndex}.voters`]: userId } });
  }
  const updated = await Poll.findOne({ messageId });

  const feedback = alreadyOnThisOption
    ? `You removed your vote for **${option.text}**.`
    : `Your vote for **${option.text}** has been recorded.`;

  await interaction.update({
    embeds: [buildPollEmbed(updated)],
    components: buildPollComponents(updated),
  });

  await interaction.followUp({ content: `✅ ${feedback}`, flags: [MessageFlags.Ephemeral] });
}

async function canCreatePoll(member) {
  if (!member) return false;

  const isPrivileged =
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild);

  if (isPrivileged) return true;

  const settings = await GuildSettings.findOne({ guildId: member.guild.id });
  return settings ? settings.allowMemberPolls : true;
}

// ─────────────────────────────────────────────────────────────
// Slash command definition (Fixed Order Validation)
// ─────────────────────────────────────────────────────────────

const data = new SlashCommandBuilder()
  .setName('poll')
  .setDescription('Create and manage polls')
  .addSubcommand((sub) => {
    sub.setName('create').setDescription('Create a poll with vote buttons');
    
    // 1. ALL REQUIRED OPTIONS PLACED FIRST
    sub.addStringOption((opt) =>
      opt.setName('question').setDescription('The poll question').setRequired(true)
    );
    sub.addStringOption((opt) =>
      opt.setName('option1').setDescription('Option 1 (Required)').setRequired(true)
    );
    sub.addStringOption((opt) =>
      opt.setName('option2').setDescription('Option 2 (Required)').setRequired(true)
    );
    sub.addIntegerOption((opt) =>
      opt
        .setName('minutes').setDescription('Auto-close the poll after this many minutes').setMinValue(1).setMaxValue(60 * 24 * 7).setRequired(true)
    );
    
    // 2. ALL OPTIONAL FIELDS APPENDED LAST
    for (let i = 3; i <= MAX_SLASH_OPTIONS; i++) {
      sub.addStringOption((opt) =>
        opt.setName(`option${i}`).setDescription(`Option ${i} (Optional)`).setRequired(false)
      );
    }
    return sub;
  })
  .addSubcommand((sub) =>
    sub
      .setName('setup')
      .setDescription('Configure who can create polls in this server (admin only)')
      .addBooleanOption((opt) =>
        opt
          .setName('allow_members').setDescription('Should ordinary members be able to create polls?').setRequired(true)
      )
  );

async function handleCreate(interaction) {
  const allowed = await canCreatePoll(interaction.member);
  if (!allowed) {
    return interaction.reply({
      content: '❌ Poll creation is currently restricted to admins/moderators in this server.',
      flags: [MessageFlags.Ephemeral],
    });
  }

  let question, options, minutes;

  question = interaction.options.getString('question');
  minutes = interaction.options.getInteger('minutes');
  options = [];

  for (let i = 1; i <= MAX_SLASH_OPTIONS; i++) {
    const val = interaction.options.getString(`option${i}`);
    if (val) options.push(val.trim());
  }

  if (options.length < 2) {
    return interaction.reply({
      content: '❌ You must provide at least 2 unique choices for a valid poll.',
      flags: [MessageFlags.Ephemeral],
    });
  }

  if (options.length > MAX_OPTIONS) {
    return interaction.reply({
      content: `❌ Too many options — Discord allows a max of ${MAX_OPTIONS}.`,
      flags: [MessageFlags.Ephemeral],
    });
  }

  const uniqueOptions = new Set(options.map((o) => o.toLowerCase()));
  if (uniqueOptions.size !== options.length) {
    return interaction.reply({
      content: '❌ Duplicate options found — each option must be unique.',
      flags: [MessageFlags.Ephemeral],
    });
  }

  if (!minutes || isNaN(minutes) || minutes <= 0 || minutes > 60 * 24 * 7) {
    return interaction.reply({
      content: '❌ Expiration time must be between 1 and 10080 minutes (7 days).',
      flags: [MessageFlags.Ephemeral],
    });
  }

  const endsAt = new Date(Date.now() + minutes * 60_000);

  await interaction.deferReply();
  const placeholder = await interaction.fetchReply();

  const poll = await Poll.create({
    messageId: placeholder.id,
    channelId: interaction.channel.id,
    guildId: interaction.guild.id,
    creatorId: interaction.user.id,
    question,
    options: options.map((text) => ({ text, voters: [] })),
    endsAt,
  });

  await interaction.editReply({
    embeds: [buildPollEmbed(poll)],
    components: buildPollComponents(poll),
  });

  const delay = endsAt.getTime() - Date.now();
  if (delay <= 2_147_483_647) {
    setTimeout(() => {
      closePoll(interaction.client, poll.messageId).catch(console.error);
    }, delay);
  }
}

async function handleSetup(interaction) {
  const isPrivileged =
    interaction.member.permissions.has(PermissionFlagsBits.Administrator) ||
    interaction.member.permissions.has(PermissionFlagsBits.ManageGuild);

  if (!isPrivileged) {
    return interaction.reply({
      content: '❌ You need **Manage Guild** or **Administrator** permission to run this.',
      flags: [MessageFlags.Ephemeral],
    });
  }

  let allowMembers;
  allowMembers = interaction.options.getBoolean('allow_members');

  await GuildSettings.findOneAndUpdate(
    { guildId: interaction.guild.id },
    {
      guildId: interaction.guild.id,
      allowMemberPolls: allowMembers,
      updatedBy: interaction.user.id,
      updatedAt: new Date(),
    },
    { upsert: true }
  );

  return interaction.reply({
    content: allowMembers
      ? '✅ Ordinary members can now create polls with `/poll create`.'
      : '✅ Poll creation is now restricted to admins/moderators (Manage Guild).',
    flags: [MessageFlags.Ephemeral],
  });
}

// ─────────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────────

module.exports = {
  data,
  async execute(interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'create') return handleCreate(interaction);
    if (sub === 'setup') return handleSetup(interaction);
  },

  castVote,
  closePoll,

  // Poll end timers only lived in memory, so after a restart polls never closed.
  init(client) {
    client.once('ready', async () => {
      const open = await Poll.find({ closed: false }).catch(() => []);
      for (const poll of open) {
        const delay = Math.max(0, new Date(poll.endsAt).getTime() - Date.now());
        setTimeout(() => closePoll(client, poll.messageId).catch(console.error), delay);
      }
    });
  },

  async handleInteraction(interaction, _activeClient) {
    const cid = interaction.customId || '';

    if (interaction.isButton()) {
      const [prefix, messageId, optionIndexRaw] = cid.split(':');

      if (prefix === 'poll_vote') {
        const optionIndex = parseInt(optionIndexRaw, 10);
        return castVote(interaction, messageId, optionIndex);
      }

      if (prefix === 'poll_close') {
        const poll = await Poll.findOne({ messageId });
        if (!poll) {
          return interaction.reply({
            content: '❌ This poll no longer exists.',
            flags: [MessageFlags.Ephemeral],
          });
        }

        const isCreator = poll.creatorId === interaction.user.id;
        const isMod = interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages);
        if (!isCreator && !isMod) {
          return interaction.reply({
            content: '❌ Only the poll creator or a moderator can close this poll.',
            flags: [MessageFlags.Ephemeral],
          });
        }

        await closePoll(interaction.client, messageId);
        return interaction.reply({ content: '🔒 Poll closed.', flags: [MessageFlags.Ephemeral] });
      }
      return; 
    }

    if (interaction.isStringSelectMenu() && cid.startsWith('poll_vote_select:')) {
      const messageId = cid.split(':')[1];
      const optionIndex = parseInt(interaction.values[0], 10);
      return castVote(interaction, messageId, optionIndex);
    }
  },
};
