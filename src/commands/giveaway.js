import {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ComponentType,
  } from 'discord.js';
  import mongoose from 'mongoose';
  
  // ─── Helpers ─────────────────────────────────────────────────────────────────
  
  function generateShortId() {
    return [...Array(8)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
  }
  
  function parseDuration(str) {
    if (!str || typeof str !== 'string') return null;
    const match = str.trim().match(/^(\d+)\s*([smhd])$/i);
    if (!match) return null;
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return value * (multipliers[unit] ?? 0) || null;
  }
  
  function parseChannelId(raw) {
    const mention = raw.match(/^<#(\d+)>$/);
    if (mention) return mention[1];
    if (/^\d+$/.test(raw.trim())) return raw.trim();
    return null;
  }
  
  // ─── Schema ──────────────────────────────────────────────────────────────────
  
  const giveawaySchema = new mongoose.Schema({
    guildId:      { type: String, required: true },
    channelId:    { type: String, required: true },
    messageId:    { type: String, default: null },
    prize:        { type: String, required: true },
    description:  { type: String, default: '' },
    winnersCount: { type: Number, default: 1 },
    hostId:       { type: String },
    endTime:      { type: Date },
    entries:      { type: [String], default: [] },
    bonusRoles:   { type: [{ roleId: String, bonusEntries: Number }], default: [] },
    requiredRole: { type: String, default: null },
    winners:      { type: [String], default: [] },
    status:       { type: String, enum: ['active', 'ended', 'cancelled'], default: 'active' },
    color:        { type: String, default: '#FF4500' },
    imageUrl:     { type: String, default: null },
    createdAt:    { type: Date, default: Date.now },
    shortId:      { type: String, unique: true },
  });
  
  const Giveaway = mongoose.models.Giveaway ?? mongoose.model('Giveaway', giveawaySchema);
  
  // ─── Embed builders ──────────────────────────────────────────────────────────
  
  function buildGiveawayEmbed(giveaway) {
    const endTs = Math.floor(new Date(giveaway.endTime).getTime() / 1000);
    const uniqueEntrants = [...new Set(giveaway.entries)].length;
  
    const fields = [
      { name: '🏆 Winners', value: String(giveaway.winnersCount), inline: true },
      { name: '⏰ Ends', value: `<t:${endTs}:R>`, inline: true },
      { name: '👥 Entries', value: String(uniqueEntrants), inline: true },
      { name: '🎟️ Host', value: `<@${giveaway.hostId}>`, inline: true },
    ];
  
    if (giveaway.requiredRole) {
      fields.push({ name: '🔒 Required Role', value: `<@&${giveaway.requiredRole}>`, inline: true });
    }
  
    let description = '';
    if (giveaway.description) description += `${giveaway.description}\n\n`;
    description += 'Click **🎉 Enter** to participate!';
  
    const embed = new EmbedBuilder()
      .setTitle(`🎉 GIVEAWAY — ${giveaway.prize}`)
      .setColor(giveaway.color)
      .setDescription(description)
      .addFields(fields)
      .setFooter({ text: `Giveaway ID: ${giveaway.shortId} · React or click to enter` });
  
    if (giveaway.imageUrl) embed.setImage(giveaway.imageUrl);
  
    return embed;
  }
  
  function buildEnterButton(shortId, count) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`giveaway_enter_${shortId}`)
        .setLabel(`🎉 Enter Giveaway (${count})`)
        .setStyle(ButtonStyle.Success)
    );
  }
  
  function buildDisabledButton(shortId, count) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`giveaway_enter_${shortId}`)
        .setLabel(`🎉 Giveaway Ended (${count})`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );
  }
  
  // ─── Winner selection ─────────────────────────────────────────────────────────
  
  function pickWinners(giveaway, count, exclude = []) {
    const uniqueEntrants = [...new Set(giveaway.entries)].filter((id) => !exclude.includes(id));
    const needed = Math.min(count, uniqueEntrants.length);
  
    // Build weighted pool
    const pool = [];
    for (const userId of uniqueEntrants) {
      let weight = 1;
      for (const { bonusEntries } of giveaway.bonusRoles) {
        // bonusRoles grant extra entries; actual tracking requires entries to store them
        // default: treat each unique entrant with base weight 1 + any bonus
        weight += bonusEntries > 0 ? bonusEntries : 0;
      }
      for (let i = 0; i < weight; i++) pool.push(userId);
    }
  
    const winners = [];
    const remaining = [...pool];
  
    while (winners.length < needed && remaining.length > 0) {
      const idx = Math.floor(Math.random() * remaining.length);
      const winner = remaining[idx];
      if (!winners.includes(winner)) winners.push(winner);
      // Remove all entries for this winner so they can't win again
      for (let i = remaining.length - 1; i >= 0; i--) {
        if (remaining[i] === winner) remaining.splice(i, 1);
      }
    }
  
    return winners;
  }
  
  // ─── endGiveaway ─────────────────────────────────────────────────────────────
  
  async function endGiveaway(giveaway, client) {
    const winners = pickWinners(giveaway, giveaway.winnersCount);
  
    giveaway.status = 'ended';
    giveaway.winners = winners;
    await giveaway.save();
  
    const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
    if (!channel) return;
  
    const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
  
    const endTs = Math.floor(new Date(giveaway.endTime).getTime() / 1000);
    const uniqueEntrants = [...new Set(giveaway.entries)].length;
    const winnerMentions = winners.length > 0
      ? winners.map((id) => `<@${id}>`).join(', ')
      : 'No winners (no entries)';
  
    const endedEmbed = new EmbedBuilder()
      .setTitle(`🎉 GIVEAWAY (ENDED) — ${giveaway.prize}`)
      .setColor('#808080')
      .setDescription(giveaway.description || null)
      .addFields([
        { name: '🏆 Winners', value: winnerMentions, inline: false },
        { name: '🎯 Winner Count', value: String(giveaway.winnersCount), inline: true },
        { name: '⏰ Ended', value: `<t:${endTs}:R>`, inline: true },
        { name: '👥 Total Entries', value: String(uniqueEntrants), inline: true },
        { name: '🎟️ Host', value: `<@${giveaway.hostId}>`, inline: true },
      ])
      .setFooter({ text: `Giveaway ID: ${giveaway.shortId}` });
  
    if (giveaway.imageUrl) endedEmbed.setImage(giveaway.imageUrl);
  
    const disabledRow = buildDisabledButton(giveaway.shortId, uniqueEntrants);
  
    if (message) {
      await message.edit({ embeds: [endedEmbed], components: [disabledRow] }).catch(() => null);
    }
  
    const announcementEmbed = new EmbedBuilder()
      .setTitle('🎊 Giveaway Winners!')
      .setColor('#FFD700')
      .setDescription(
        `Congratulations ${winnerMentions}!\nYou won **${giveaway.prize}**!\n\n> Hosted by <@${giveaway.hostId}>`
      )
      .setFooter({ text: `Giveaway ID: ${giveaway.shortId}` });
  
    await channel.send({ content: winners.map((id) => `<@${id}>`).join(' '), embeds: [announcementEmbed] }).catch(() => null);
  
    for (const winnerId of winners) {
      const user = await client.users.fetch(winnerId).catch(() => null);
      if (!user) continue;
      await user.send({
        embeds: [
          new EmbedBuilder()
            .setTitle('🎉 You won a giveaway!')
            .setColor('#FFD700')
            .setDescription(`You won **${giveaway.prize}**!\n\nHosted by <@${giveaway.hostId}> in guild \`${giveaway.guildId}\`.`)
            .setFooter({ text: `Giveaway ID: ${giveaway.shortId}` }),
        ],
      }).catch(() => null);
    }
  }
  
  // ─── Scheduler ───────────────────────────────────────────────────────────────
  
  function startScheduler(client) {
    if (global.__giveawayScheduler) return;
    global.__giveawayScheduler = setInterval(async () => {
      try {
        const expired = await Giveaway.find({ status: 'active', endTime: { $lte: new Date() } });
        for (const giveaway of expired) {
          await endGiveaway(giveaway, client).catch(() => null);
        }
      } catch {}
    }, 30_000);
  }
  
  // ─── Command data ─────────────────────────────────────────────────────────────
  
  const data = new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Giveaway management')
    .addSubcommand((sub) =>
      sub.setName('start').setDescription('Start a new giveaway')
    )
    .addSubcommand((sub) =>
      sub
        .setName('end')
        .setDescription('End a giveaway early and pick winners')
        .addStringOption((opt) =>
          opt.setName('id').setDescription('Short giveaway ID').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('reroll')
        .setDescription('Reroll winners for an ended giveaway')
        .addStringOption((opt) =>
          opt.setName('id').setDescription('Short giveaway ID').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('count').setDescription('Number of winners to reroll').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub.setName('list').setDescription('List active giveaways')
    )
    .addSubcommand((sub) =>
      sub
        .setName('entries')
        .setDescription('Show who entered a giveaway')
        .addStringOption((opt) =>
          opt.setName('id').setDescription('Short giveaway ID').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('cancel')
        .setDescription('Cancel a giveaway without picking winners')
        .addStringOption((opt) =>
          opt.setName('id').setDescription('Short giveaway ID').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('edit')
        .setDescription('Edit an active giveaway')
        .addStringOption((opt) =>
          opt.setName('id').setDescription('Short giveaway ID').setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
  
  // ─── execute ─────────────────────────────────────────────────────────────────
  
  async function execute(interaction) {
    const sub = interaction.options.getSubcommand();
  
    if (sub === 'start') {
      const modal = new ModalBuilder()
        .setCustomId('giveaway_modal_start')
        .setTitle('Start a Giveaway');
  
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('prize')
            .setLabel('Prize')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Description (optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setMaxLength(500)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('duration')
            .setLabel('Duration')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('e.g. 10m, 2h, 1d, 7d')
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('winners')
            .setLabel('Winners Count')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('1')
            .setMaxLength(2)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('channel')
            .setLabel('Channel ID or mention')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('#giveaways or ID')
        )
      );
  
      return interaction.showModal(modal);
    }
  
    if (sub === 'end') {
      const shortId = interaction.options.getString('id');
      const giveaway = await Giveaway.findOne({ shortId, guildId: interaction.guildId });
      if (!giveaway) return interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
      if (giveaway.status !== 'active') return interaction.reply({ content: '❌ This giveaway is not active.', ephemeral: true });
  
      await interaction.deferReply({ ephemeral: true });
      await endGiveaway(giveaway, interaction.client);
      return interaction.editReply('✅ Giveaway ended and winners selected.');
    }
  
    if (sub === 'reroll') {
      const shortId = interaction.options.getString('id');
      const giveaway = await Giveaway.findOne({ shortId, guildId: interaction.guildId });
      if (!giveaway) return interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
      if (giveaway.status !== 'ended') return interaction.reply({ content: '❌ Can only reroll ended giveaways.', ephemeral: true });
  
      const count = interaction.options.getInteger('count') ?? giveaway.winnersCount;
      const excludeOld = giveaway.entries.length > count ? giveaway.winners : [];
      const newWinners = pickWinners(giveaway, count, excludeOld);
  
      if (newWinners.length === 0) return interaction.reply({ content: '❌ No eligible entries to reroll.', ephemeral: true });
  
      giveaway.winners = newWinners;
      await giveaway.save();
  
      const channel = await interaction.client.channels.fetch(giveaway.channelId).catch(() => null);
      const winnerMentions = newWinners.map((id) => `<@${id}>`).join(', ');
  
      if (channel) {
        const rerollEmbed = new EmbedBuilder()
          .setTitle('🔁 Giveaway Rerolled!')
          .setColor('#FFD700')
          .setDescription(`New winners for **${giveaway.prize}**: ${winnerMentions}`)
          .setFooter({ text: `Giveaway ID: ${giveaway.shortId}` });
        await channel.send({ content: newWinners.map((id) => `<@${id}>`).join(' '), embeds: [rerollEmbed] }).catch(() => null);
      }
  
      return interaction.reply({ content: `✅ Rerolled! New winners: ${winnerMentions}`, ephemeral: true });
    }
  
    if (sub === 'list') {
      const giveaways = await Giveaway.find({ guildId: interaction.guildId, status: 'active' }).sort({ endTime: 1 });
      if (giveaways.length === 0) return interaction.reply({ content: '📭 No active giveaways.', ephemeral: true });
  
      const embed = new EmbedBuilder()
        .setTitle('🎉 Active Giveaways')
        .setColor('#FF4500')
        .setDescription(
          giveaways
            .map((g) => {
              const ts = Math.floor(new Date(g.endTime).getTime() / 1000);
              const entrants = [...new Set(g.entries)].length;
              return `**${g.prize}** \`${g.shortId}\`\n↳ <#${g.channelId}> · ends <t:${ts}:R> · ${entrants} entrants · ${g.winnersCount} winner(s)`;
            })
            .join('\n\n')
        )
        .setFooter({ text: `${giveaways.length} active giveaway(s)` });
  
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }
  
    if (sub === 'entries') {
      const shortId = interaction.options.getString('id');
      const giveaway = await Giveaway.findOne({ shortId, guildId: interaction.guildId });
      if (!giveaway) return interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
  
      const uniqueEntrants = [...new Set(giveaway.entries)];
      const totalEntries = giveaway.entries.length;
      const perPage = 20;
      const totalPages = Math.max(1, Math.ceil(uniqueEntrants.length / perPage));
      let page = 0;
  
      const hasBonusRoles = giveaway.bonusRoles.length > 0;
  
      function buildEntriesEmbed(p) {
        const slice = uniqueEntrants.slice(p * perPage, p * perPage + perPage);
        const embed = new EmbedBuilder()
          .setTitle(`📋 Entries — ${giveaway.prize}`)
          .setColor('#FF4500')
          .setDescription(
            slice.length > 0
              ? slice.map((id, i) => `${p * perPage + i + 1}. <@${id}>`).join('\n')
              : 'No entries yet.'
          )
          .addFields([
            { name: '👥 Unique Entrants', value: String(uniqueEntrants.length), inline: true },
            { name: '🎟️ Total Entries', value: String(totalEntries), inline: true },
          ])
          .setFooter({ text: `Page ${p + 1}/${totalPages} · Giveaway ID: ${shortId}${hasBonusRoles ? ' · ⚠️ Weighted entries active' : ''}` });
        return embed;
      }
  
      function buildPaginationRow(p) {
        return new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('entries_prev')
            .setLabel('◀ Prev')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(p === 0),
          new ButtonBuilder()
            .setCustomId('entries_next')
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(p >= totalPages - 1)
        );
      }
  
      const reply = await interaction.reply({
        embeds: [buildEntriesEmbed(page)],
        components: totalPages > 1 ? [buildPaginationRow(page)] : [],
        ephemeral: true,
        fetchReply: true,
      });
  
      if (totalPages <= 1) return;
  
      const collector = reply.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 120_000,
        filter: (i) => i.user.id === interaction.user.id,
      });
  
      collector.on('collect', async (i) => {
        if (i.customId === 'entries_prev') page = Math.max(0, page - 1);
        if (i.customId === 'entries_next') page = Math.min(totalPages - 1, page + 1);
        await i.update({ embeds: [buildEntriesEmbed(page)], components: [buildPaginationRow(page)] }).catch(() => null);
      });
  
      collector.on('end', () => {
        interaction.editReply({ components: [] }).catch(() => null);
      });
  
      return;
    }
  
    if (sub === 'cancel') {
      const shortId = interaction.options.getString('id');
      const giveaway = await Giveaway.findOne({ shortId, guildId: interaction.guildId });
      if (!giveaway) return interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
      if (giveaway.status !== 'active') return interaction.reply({ content: '❌ This giveaway is not active.', ephemeral: true });
  
      giveaway.status = 'cancelled';
      await giveaway.save();
  
      const channel = await interaction.client.channels.fetch(giveaway.channelId).catch(() => null);
      if (channel && giveaway.messageId) {
        const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
        if (message) {
          const cancelEmbed = new EmbedBuilder()
            .setTitle(`🚫 GIVEAWAY CANCELLED — ${giveaway.prize}`)
            .setColor('#808080')
            .setDescription('This giveaway has been cancelled.')
            .setFooter({ text: `Giveaway ID: ${giveaway.shortId}` });
  
          const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`giveaway_enter_${shortId}`)
              .setLabel('🚫 Cancelled')
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true)
          );
  
          await message.edit({ embeds: [cancelEmbed], components: [disabledRow] }).catch(() => null);
        }
      }
  
      return interaction.reply({ content: '✅ Giveaway cancelled.', ephemeral: true });
    }
  
    if (sub === 'edit') {
      const shortId = interaction.options.getString('id');
      const giveaway = await Giveaway.findOne({ shortId, guildId: interaction.guildId });
      if (!giveaway) return interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
      if (giveaway.status !== 'active') return interaction.reply({ content: '❌ Can only edit active giveaways.', ephemeral: true });
  
      const currentDurationMs = new Date(giveaway.endTime).getTime() - Date.now();
      const currentDurationMins = Math.max(1, Math.round(currentDurationMs / 60_000));
  
      const modal = new ModalBuilder()
        .setCustomId(`giveaway_modal_edit_${shortId}`)
        .setTitle('Edit Giveaway');
  
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('prize')
            .setLabel('Prize')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(100)
            .setValue(giveaway.prize)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Description (optional)')
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(false)
            .setMaxLength(500)
            .setValue(giveaway.description ?? '')
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('winners')
            .setLabel('Winners Count')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMaxLength(2)
            .setValue(String(giveaway.winnersCount))
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('duration')
            .setLabel('Remaining Duration (from now)')
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setPlaceholder('e.g. 10m, 2h, 1d')
            .setValue(`${currentDurationMins}m`)
        )
      );
  
      return interaction.showModal(modal);
    }
  }
  
  // ─── handleInteraction ────────────────────────────────────────────────────────
  
  async function handleInteraction(interaction) {
    const { customId } = interaction;
  
    // Button: enter giveaway
    if (interaction.isButton() && customId.startsWith('giveaway_enter_')) {
      const shortId = customId.replace('giveaway_enter_', '');
      const giveaway = await Giveaway.findOne({ shortId });
  
      if (!giveaway) return interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
      if (giveaway.status !== 'active') return interaction.reply({ content: '❌ This giveaway has ended.', ephemeral: true });
      if (new Date(giveaway.endTime) <= new Date()) return interaction.reply({ content: '❌ This giveaway has expired.', ephemeral: true });
  
      if (giveaway.requiredRole) {
        const member = interaction.member ?? await interaction.guild.members.fetch(interaction.user.id).catch(() => null);
        if (!member?.roles.cache.has(giveaway.requiredRole)) {
          return interaction.reply({ content: `❌ You need the <@&${giveaway.requiredRole}> role to enter.`, ephemeral: true });
        }
      }
  
      const userId = interaction.user.id;
      const alreadyEntered = giveaway.entries.includes(userId);
  
      if (alreadyEntered) {
        giveaway.entries = giveaway.entries.filter((id) => id !== userId);
        await giveaway.save();
        await interaction.reply({ content: '❌ Your entry has been removed.', ephemeral: true });
      } else {
        giveaway.entries.push(userId);
        await giveaway.save();
        await interaction.reply({ content: '🎉 You have entered the giveaway! Good luck!', ephemeral: true });
      }
  
      const uniqueCount = [...new Set(giveaway.entries)].length;
      const updatedRow = buildEnterButton(shortId, uniqueCount);
  
      const updatedEmbed = buildGiveawayEmbed(giveaway);
  
      await interaction.message.edit({ embeds: [updatedEmbed], components: [updatedRow] }).catch(() => null);
      return;
    }
  
    // Modal: start giveaway
    if (interaction.isModalSubmit() && customId === 'giveaway_modal_start') {
      const prize = interaction.fields.getTextInputValue('prize').trim();
      const description = interaction.fields.getTextInputValue('description').trim();
      const durationStr = interaction.fields.getTextInputValue('duration').trim();
      const winnersRaw = interaction.fields.getTextInputValue('winners').trim();
      const channelRaw = interaction.fields.getTextInputValue('channel').trim();
  
      const durationMs = parseDuration(durationStr);
      if (!durationMs) return interaction.reply({ content: '❌ Invalid duration. Use formats like `10m`, `2h`, `1d`.', ephemeral: true });
  
      const winnersCount = parseInt(winnersRaw, 10);
      if (isNaN(winnersCount) || winnersCount < 1) return interaction.reply({ content: '❌ Winners count must be a positive number.', ephemeral: true });
  
      const channelId = parseChannelId(channelRaw);
      if (!channelId) return interaction.reply({ content: '❌ Invalid channel. Use a mention like `#giveaways` or a channel ID.', ephemeral: true });
  
      const targetChannel = await interaction.client.channels.fetch(channelId).catch(() => null);
      if (!targetChannel?.isTextBased()) return interaction.reply({ content: '❌ Channel not found or not a text channel.', ephemeral: true });
  
      const shortId = generateShortId();
      const endTime = new Date(Date.now() + durationMs);
  
      const giveaway = await Giveaway.create({
        guildId: interaction.guildId,
        channelId,
        prize,
        description,
        winnersCount,
        hostId: interaction.user.id,
        endTime,
        shortId,
      });
  
      const embed = buildGiveawayEmbed(giveaway);
      const row = buildEnterButton(shortId, 0);
  
      const message = await targetChannel.send({ embeds: [embed], components: [row] }).catch(() => null);
  
      if (message) {
        giveaway.messageId = message.id;
        await giveaway.save();
      }
  
      return interaction.reply({ content: `✅ Giveaway started in <#${channelId}>!`, ephemeral: true });
    }
  
    // Modal: edit giveaway
    if (interaction.isModalSubmit() && customId.startsWith('giveaway_modal_edit_')) {
      const shortId = customId.replace('giveaway_modal_edit_', '');
      const giveaway = await Giveaway.findOne({ shortId, guildId: interaction.guildId });
  
      if (!giveaway) return interaction.reply({ content: '❌ Giveaway not found.', ephemeral: true });
      if (giveaway.status !== 'active') return interaction.reply({ content: '❌ Can only edit active giveaways.', ephemeral: true });
  
      const prize = interaction.fields.getTextInputValue('prize').trim();
      const description = interaction.fields.getTextInputValue('description').trim();
      const winnersRaw = interaction.fields.getTextInputValue('winners').trim();
      const durationStr = interaction.fields.getTextInputValue('duration').trim();
  
      const durationMs = parseDuration(durationStr);
      if (!durationMs) return interaction.reply({ content: '❌ Invalid duration format.', ephemeral: true });
  
      const winnersCount = parseInt(winnersRaw, 10);
      if (isNaN(winnersCount) || winnersCount < 1) return interaction.reply({ content: '❌ Winners count must be a positive number.', ephemeral: true });
  
      giveaway.prize = prize;
      giveaway.description = description;
      giveaway.winnersCount = winnersCount;
      giveaway.endTime = new Date(Date.now() + durationMs);
      await giveaway.save();
  
      const channel = await interaction.client.channels.fetch(giveaway.channelId).catch(() => null);
      if (channel && giveaway.messageId) {
        const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
        if (message) {
          const updatedEmbed = buildGiveawayEmbed(giveaway);
          const uniqueCount = [...new Set(giveaway.entries)].length;
          const row = buildEnterButton(shortId, uniqueCount);
          await message.edit({ embeds: [updatedEmbed], components: [row] }).catch(() => null);
        }
      }
  
      return interaction.reply({ content: '✅ Giveaway updated successfully.', ephemeral: true });
    }
  }
  
  // ─── Export ───────────────────────────────────────────────────────────────────
  
  module.exports = { data, name: 'giveaway', execute, handleInteraction, startScheduler };
  