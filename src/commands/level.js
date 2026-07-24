const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const database = require('../utils/database');
const { createCanvas, loadImage } = require('canvas');

// --- Helper: Generate Level Up Card ---
async function generateLevelUpCard(user, oldLevel, newLevel) {
    const canvas = createCanvas(700, 250);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#2B2D31'; // Dark Grey
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Accent Bar
    ctx.fillStyle = '#5865F2'; // Blurple
    ctx.fillRect(0, 0, 10, canvas.height);

    // Avatar
    try {
        const avatarURL = user.displayAvatarURL({ extension: 'png', size: 128 });
        const avatar = await loadImage(avatarURL);
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(125, 125, 75, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, 50, 50, 150, 150);
        ctx.restore();

        // Avatar Border
        ctx.strokeStyle = '#5865F2';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(125, 125, 75, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.stroke();
    } catch (e) {
        console.error('Canvas Avatar Error:', e);
    }

    // Helper to draw centered text
    const drawCenteredText = (text, y, font, color) => {
        ctx.font = font;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.fillText(text, 450, y); // Center is roughly 450 (700/2 + 200 offset for avatar space)
    };

    // Text: "CONGRATS!"
    drawCenteredText('CONGRATS!', 80, 'bold 40px sans-serif', '#FFFFFF');

    // Text: @username
    drawCenteredText(`@${user.username}`, 130, 'bold 30px sans-serif', '#FFFFFF');

    // Text: [Previous Level] => [New Level]
    drawCenteredText(`Level ${oldLevel}  =>  Level ${newLevel}`, 200, 'bold 50px sans-serif', '#5865F2');

    return new AttachmentBuilder(canvas.toBuffer(), { name: 'levelup.png' });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Leveling system commands')
        .addSubcommand(sub =>
            sub.setName('rank')
                .setDescription('Show your or another user\'s rank and XP')
                .addUserOption(opt => opt.setName('user').setDescription('User to check (defaults to you)').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('leaderboard')
                .setDescription('Show the top 10 users by XP')
        )
        .addSubcommand(sub =>
            sub.setName('settings')
                .setDescription('Configure leveling settings (Staff only)')
                .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        ),

    name: 'level',

    async execute(interaction, client) {
        // Handle Prefix Commands
        const isPrefix = interaction.isCommand ? !interaction.isCommand() : true;
        if (isPrefix) {
            const args = interaction.content.slice(1).trim().split(/ +/);
            const command = args.shift().toLowerCase();
            if (command !== 'level') return;

            const subcommand = args[0] ? args[0].toLowerCase() : 'help';
            
            if (subcommand === 'rank') {
                return this.handleRankCommand(interaction, args[1] ? args[1].replace(/<@!?>/g, '') : null, client);
            } else if (subcommand === 'leaderboard') {
                return this.handleLeaderboardCommand(interaction);
            } else if (subcommand === 'settings') {
                if (!interaction.member.permissions.has(PermissionFlagsBits.ManageGuild)) {
                    return interaction.reply('❌ You need **Manage Server** permissions to use this command.');
                }
                return this.handleSettingsCommand(interaction);
            } else {
                return interaction.reply('Usage: `|level rank [@user]`, `|level leaderboard`, `|level settings`');
            }
        }

        // Handle Slash Commands
        const subcommand = interaction.options.getSubcommand();
        try {
            if (subcommand === 'rank') {
                return await this.handleRankCommand(interaction, interaction.options.getUser('user')?.id, client);
            } else if (subcommand === 'leaderboard') {
                return await this.handleLeaderboardCommand(interaction);
            } else if (subcommand === 'settings') {
                return await this.handleSettingsCommand(interaction);
            }
        } catch (error) {
            console.error('Level command error:', error);
            if (interaction.deferred || interaction.replied) {
                return interaction.editReply({ content: '❌ An error occurred.' }).catch(() => null);
            }
            return interaction.reply({ content: '❌ An error occurred.', ephemeral: true }).catch(() => null);
        }
    },

    // --- Command Handlers ---

    async handleRankCommand(interaction, targetUserId, client) {
        const isPrefix = interaction.isCommand ? !interaction.isCommand() : true;
        const guild = interaction.guild;
        let targetUser;
        
        if (targetUserId) {
            targetUser = await client.users.fetch(targetUserId).catch(() => null);
            if (!targetUser) return interaction.reply({ content: '❌ User not found.', ephemeral: true }).catch(() => null);
        } else {
            targetUser = isPrefix ? interaction.author : interaction.user;
        }
        
        const userData = await database.findOne({ 
            guildId: guild.id, 
            userId: targetUser.id 
        }).catch(() => null) || {};
        
        const xp = userData.xp || 0;
        const level = Math.floor(Math.sqrt(xp / 100));
        
        const rank = await database.countDocuments({ 
            guildId: guild.id, 
            xp: { $gt: xp } 
        }).catch(() => 0) + 1;
        
        const currentLevelXp = level * level * 100;
        const nextLevelXp = (level + 1) * (level + 1) * 100;
        const xpForNextLevel = nextLevelXp - currentLevelXp;
        const xpProgress = xp - currentLevelXp;
        const progressPercent = Math.floor((xpProgress / xpForNextLevel) * 100);
        
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle(`📊 ${targetUser.username}'s Rank`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Rank', value: `#${rank}`, inline: true },
                { name: 'Level', value: `${level}`, inline: true },
                { name: 'XP', value: `${xp}`, inline: true },
                { name: 'Progress to Next Level', value: `${xpProgress}/${xpForNextLevel} XP (${progressPercent}%)` }
            );
            
        return interaction.reply({ embeds: [embed] }).catch(() => null);
    },

    async handleLeaderboardCommand(interaction) {
        const users = await database.find({ 
            guildId: interaction.guild.id, 
            xp: { $gt: 0 } 
        })
        .sort({ xp: -1 })
        .limit(10)
        .catch(() => null) || [];
        
        if (users.length === 0) {
            const embed = new EmbedBuilder()
                .setColor('#99AAB5')
                .setTitle('🏆 XP Leaderboard')
                .setDescription('No users with XP yet.');
                
            return interaction.reply({ embeds: [embed] }).catch(() => null);
        }
        
        const leaderboard = users.map((u, i) => {
            const level = Math.floor(Math.sqrt(u.xp / 100));
            return `**${i + 1}.** <@${u.userId}> — **Level ${level}** (${u.xp} XP)`;
        }).join('\n');
        
        const embed = new EmbedBuilder()
            .setColor('#FAA61A')
            .setTitle('🏆 XP Leaderboard')
            .setDescription(leaderboard);
            
        return interaction.reply({ embeds: [embed] }).catch(() => null);
    },

    async handleSettingsCommand(interaction) {
        const isPrefix = interaction.isCommand ? !interaction.isCommand() : true;
        if (isPrefix) {
            return interaction.reply('⚙️ Please use the Slash Command `/level settings` to open the interactive settings menu!');
        }

        await interaction.deferReply({ ephemeral: true });
        
        const config = await database.findOne({ guildId: interaction.guild.id }).catch(() => null) || {};
        const levelConfig = config.levelConfig || {};
        
        const embed = new EmbedBuilder()
            .setColor('#5865F2')
            .setTitle('⚙️ Leveling Settings')
            .setDescription('Select an option below to configure the leveling system.')
            .addFields(
                { name: 'Status', value: levelConfig.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                { name: 'Announcement Channel', value: levelConfig.channelId ? `<#${levelConfig.channelId}>` : 'Not set', inline: true },
                { name: 'Level-Up Style', value: levelConfig.cardStyle === 'card' ? '🎨 Visual Card' : '📝 Text Message', inline: true },
                { name: 'Ping on Level-Up', value: levelConfig.pingUser ? '🔔 Yes' : '🔇 No', inline: true },
                { name: 'Role Rewards', value: levelConfig.rewards?.length ? `${levelConfig.rewards.length} configured` : 'None configured', inline: true },
                { name: 'Custom Level-Up Text', value: levelConfig.levelUpText ? `\`\`\`${levelConfig.levelUpText}\`\`\`` : 'Not set', inline: false }
            );

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('level_settings_menu')
                .setPlaceholder('Choose a setting to configure...')
                .addOptions([
                    { label: 'Toggle Status', value: 'toggle_status', description: 'Enable or disable leveling' },
                    { label: 'Set Announcement Channel', value: 'set_channel', description: 'Where level-up messages are sent' },
                    { label: 'Set Level-Up Style', value: 'set_style', description: 'Visual Card vs Text Message' },
                    { label: 'Toggle Ping on Level-Up', value: 'toggle_ping', description: 'Ping the user when they level up' },
                    { label: 'Set Custom Level-Up Text', value: 'set_text', description: 'Customize the level-up message' },
                    { label: 'Manage Role Rewards', value: 'manage_rewards', description: 'Add or remove role rewards' }
                ])
        );

        return interaction.editReply({ embeds: [embed], components: [row] });
    },

    // --- Interaction Handler for Settings Wizard ---

    async handleInteraction(interaction, client) {
        if (!interaction.isStringSelectMenu() && !interaction.isButton() && !interaction.isModalSubmit()) return;
        const id = interaction.customId;

        try {
            // --- Settings Main Menu ---
            if (id === 'level_settings_menu') {
                const selection = interaction.values[0];
                
                if (selection === 'toggle_status') {
                    const config = await database.findOne({ guildId: interaction.guild.id }).catch(() => null) || {};
                    const newState = !(config.levelConfig?.enabled ?? false);
                    
                    await database.findOneAndUpdate(
                        { guildId: interaction.guild.id },
                        { $set: { 'levelConfig.enabled': newState, 'levelConfig.status': newState ? 'on' : 'off' } },
                        { upsert: true }
                    ).catch(() => null);

                    return interaction.update({ 
                        content: `✅ Leveling system is now **${newState ? 'ENABLED' : 'DISABLED'}**.`, 
                        embeds: [], 
                        components: [] 
                    });
                }

                if (selection === 'toggle_ping') {
                    const config = await database.findOne({ guildId: interaction.guild.id }).catch(() => null) || {};
                    const newState = !(config.levelConfig?.pingUser ?? true); // Default to true
                    
                    await database.findOneAndUpdate(
                        { guildId: interaction.guild.id },
                        { $set: { 'levelConfig.pingUser': newState } },
                        { upsert: true }
                    ).catch(() => null);

                    return interaction.update({ 
                        content: `✅ Level-up pings are now **${newState ? 'ENABLED' : 'DISABLED'}**.`, 
                        embeds: [], 
                        components: [] 
                    });
                }

                if (selection === 'set_channel') {
                    const channels = interaction.guild.channels.cache.filter(c => c.type === 0).first(24); // 0 = GuildText
                    if (!channels.length) return interaction.update({ content: '❌ No text channels found.', embeds: [], components: [] });

                    const row = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('level_set_channel_menu')
                            .setPlaceholder('Select a channel...')
                            .addOptions(channels.map(c => ({ label: `#${c.name}`.slice(0, 90), value: c.id })))
                    );
                    return interaction.update({ content: '📢 **Select Announcement Channel**', embeds: [], components: [row] });
                }

                if (selection === 'set_style') {
                    const row = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('level_set_style_menu')
                            .setPlaceholder('Select level-up style...')
                            .addOptions([
                                { label: '🎨 Visual Card', value: 'card', description: 'Generate an image card' },
                                { label: '📝 Text Message', value: 'text', description: 'Send a standard text message' }
                            ])
                    );
                    return interaction.update({ content: '🎨 **Select Level-Up Style**', embeds: [], components: [row] });
                }

                if (selection === 'set_text') {
                    const config = await database.findOne({ guildId: interaction.guild.id }).catch(() => null) || {};
                    const currentText = config.levelConfig?.levelUpText || 'Congratulations {user}! You reached Level {level}!';
                    
                    const modal = new ModalBuilder()
                        .setCustomId('level_text_modal')
                        .setTitle('Set Custom Level-Up Text');
                    
                    const textInput = new TextInputBuilder()
                        .setCustomId('levelUpText')
                        .setLabel("Enter the message. Use {user} and {level}")
                        .setStyle(TextInputStyle.Paragraph)
                        .setValue(currentText)
                        .setRequired(true);
                    
                    modal.addComponents(new ActionRowBuilder().addComponents(textInput));
                    return interaction.showModal(modal);
                }

                if (selection === 'manage_rewards') {
                    const config = await database.findOne({ guildId: interaction.guild.id }).catch(() => null) || {};
                    const rewards = config.levelConfig?.rewards || [];
                    
                    const rewardList = rewards.length > 0 
                        ? rewards.map(r => `• Level ${r.level}: <@&${r.roleId}>`).join('\n')
                        : 'No rewards configured yet.';

                    const embed = new EmbedBuilder()
                        .setColor('#5865F2')
                        .setTitle('🎁 Manage Role Rewards')
                        .setDescription(rewardList);

                    const row1 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('level_reward_add')
                            .setLabel('Add Reward')
                            .setStyle(ButtonStyle.Success),
                        new ButtonBuilder()
                            .setCustomId('level_reward_remove')
                            .setLabel('Remove Reward')
                            .setStyle(ButtonStyle.Danger)
                            .setDisabled(rewards.length === 0)
                    );
                    
                    const row2 = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('level_settings_back')
                            .setLabel('Back to Settings')
                            .setStyle(ButtonStyle.Secondary)
                    );

                    return interaction.update({ embeds: [embed], components: [row1, row2] });
                }
            }

            // --- Set Channel Menu ---
            if (id === 'level_set_channel_menu') {
                const channelId = interaction.values[0];
                await database.findOneAndUpdate(
                    { guildId: interaction.guild.id },
                    { $set: { 'levelConfig.channelId': channelId } },
                    { upsert: true }
                ).catch(() => null);

                return interaction.update({ content: `✅ Announcement channel set to <#${channelId}>.`, embeds: [], components: [] });
            }

            // --- Set Style Menu ---
            if (id === 'level_set_style_menu') {
                const style = interaction.values[0];
                await database.findOneAndUpdate(
                    { guildId: interaction.guild.id },
                    { $set: { 'levelConfig.cardStyle': style } },
                    { upsert: true }
                ).catch(() => null);

                return interaction.update({ content: `✅ Level-up style set to **${style === 'card' ? 'Visual Card' : 'Text Message'}**.`, embeds: [], components: [] });
            }

            // --- Modal Submit for Custom Text ---
            if (id === 'level_text_modal') {
                const text = interaction.fields.getTextInputValue('levelUpText');
                await database.findOneAndUpdate(
                    { guildId: interaction.guild.id },
                    { $set: { 'levelConfig.levelUpText': text } },
                    { upsert: true }
                ).catch(() => null);

                return interaction.reply({ content: `✅ Custom level-up text updated to:\n\`\`\`${text}\`\`\``, ephemeral: true });
            }

            // --- Reward Add Flow ---
            if (id === 'level_reward_add') {
                return interaction.reply({ 
                    content: '➕ **Add Reward**\nPlease type the level and mention the role in this format:\n`<level> @role`\nExample: `10 @Verified`', 
                    ephemeral: true 
                }).then(() => {
                    const filter = m => m.author.id === interaction.user.id;
                    interaction.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] })
                        .then(async collected => {
                            const msg = collected.first();
                            const args = msg.content.split(' ');
                            const level = parseInt(args[0]);
                            const role = msg.mentions.roles.first();

                            if (!level || !role) {
                                return msg.reply('❌ Invalid format. Please use: `<level> @role`');
                            }

                            await database.findOneAndUpdate(
                                { guildId: interaction.guild.id },
                                { $push: { 'levelConfig.rewards': { level, roleId: role.id } } },
                                { upsert: true }
                            ).catch(() => null);

                            msg.reply(`✅ Added reward: **Level ${level}** -> ${role.name}`);
                        })
                        .catch(() => interaction.followUp({ content: '❌ Timed out. Please try again.', ephemeral: true }));
                });
            }

            // --- Reward Remove Flow ---
            if (id === 'level_reward_remove') {
                const config = await database.findOne({ guildId: interaction.guild.id }).catch(() => null) || {};
                const rewards = config.levelConfig?.rewards || [];

                if (rewards.length === 0) {
                    return interaction.update({ content: '❌ No rewards to remove.', embeds: [], components: [] });
                }

                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('level_reward_remove_menu')
                        .setPlaceholder('Select a reward to remove...')
                        .addOptions(rewards.map(r => ({ label: `Level ${r.level}`, value: `${r.level}` })))
                );

                return interaction.update({ content: '➖ **Remove Reward**', embeds: [], components: [row] });
            }

            if (id === 'level_reward_remove_menu') {
                const levelToRemove = parseInt(interaction.values[0]);
                await database.findOneAndUpdate(
                    { guildId: interaction.guild.id },
                    { $pull: { 'levelConfig.rewards': { level: levelToRemove } } },
                    { upsert: true }
                ).catch(() => null);

                return interaction.update({ content: `✅ Removed reward for **Level ${levelToRemove}**.`, embeds: [], components: [] });
            }

            // --- Back to Settings Button ---
            if (id === 'level_settings_back') {
                const config = await database.findOne({ guildId: interaction.guild.id }).catch(() => null) || {};
                const levelConfig = config.levelConfig || {};
                
                const embed = new EmbedBuilder()
                    .setColor('#5865F2')
                    .setTitle('⚙️ Leveling Settings')
                    .setDescription('Select an option below to configure the leveling system.')
                    .addFields(
                        { name: 'Status', value: levelConfig.enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                        { name: 'Announcement Channel', value: levelConfig.channelId ? `<#${levelConfig.channelId}>` : 'Not set', inline: true },
                        { name: 'Level-Up Style', value: levelConfig.cardStyle === 'card' ? '🎨 Visual Card' : '📝 Text Message', inline: true },
                        { name: 'Ping on Level-Up', value: levelConfig.pingUser ? '🔔 Yes' : '🔇 No', inline: true },
                        { name: 'Role Rewards', value: levelConfig.rewards?.length ? `${levelConfig.rewards.length} configured` : 'None configured', inline: true },
                        { name: 'Custom Level-Up Text', value: levelConfig.levelUpText ? `\`\`\`${levelConfig.levelUpText}\`\`\`` : 'Not set', inline: false }
                    );

                const row = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('level_settings_menu')
                        .setPlaceholder('Choose a setting to configure...')
                        .addOptions([
                            { label: 'Toggle Status', value: 'toggle_status', description: 'Enable or disable leveling' },
                            { label: 'Set Announcement Channel', value: 'set_channel', description: 'Where level-up messages are sent' },
                            { label: 'Set Level-Up Style', value: 'set_style', description: 'Visual Card vs Text Message' },
                            { label: 'Toggle Ping on Level-Up', value: 'toggle_ping', description: 'Ping the user when they level up' },
                            { label: 'Set Custom Level-Up Text', value: 'set_text', description: 'Customize the level-up message' },
                            { label: 'Manage Role Rewards', value: 'manage_rewards', description: 'Add or remove role rewards' }
                        ])
                );

                return interaction.update({ embeds: [embed], components: [row] });
            }

        } catch (err) {
            console.error('Level settings interaction error:', err);
            if (interaction.deferred || interaction.replied) {
                interaction.editReply({ content: '❌ An error occurred in the settings menu.', components: [] }).catch(() => null);
            } else {
                interaction.reply({ content: '❌ An error occurred in the settings menu.', ephemeral: true }).catch(() => null);
            }
        }
    },

    // --- Level Up Logic ---

    async checkLevelUp(userId, guildId, client) {
        const userData = await database.findOne({ guildId, userId }).catch(() => null);
        if (!userData || !userData.xp) return;
        
        const newLevel = Math.floor(Math.sqrt(userData.xp / 100));
        const oldLevel = userData.level || 0;
        
        if (newLevel > oldLevel) {
            await database.findOneAndUpdate(
                { guildId, userId },
                { $set: { level: newLevel } },
                { upsert: true }
            ).catch(() => null);
            
            const config = await database.findOne({ guildId }).catch(() => null);
            const levelConfig = config?.levelConfig;
            
            if (!levelConfig?.enabled) return;

            // Check for role rewards
            const rewards = levelConfig.rewards || [];
            const guild = client.guilds.cache.get(guildId);
            const member = guild?.members.cache.get(userId);
            
            if (member && rewards.length > 0) {
                for (const reward of rewards) {
                    if (reward.level <= newLevel) {
                        const role = guild.roles.cache.get(reward.roleId);
                        if (role && !member.roles.cache.has(role.id)) {
                            await member.roles.add(role).catch(() => null);
                        }
                    }
                }
            }

            // Send Announcement
            if (levelConfig.channelId) {
                const channel = guild?.channels.cache.get(levelConfig.channelId);
                if (channel) {
                    const user = client.users.cache.get(userId);
                    const pingContent = levelConfig.pingUser ? `${user}` : `🎉 ${user.username} just leveled up!`;
                    
                    // Process custom text
                    let customText = levelConfig.levelUpText || 'Congratulations {user}! You reached Level {level}!';
                    customText = customText.replace(/{user}/g, user.toString())
                                         .replace(/{level}/g, newLevel)
                                         .replace(/{oldlevel}/g, oldLevel);
                    
                    if (levelConfig.cardStyle === 'card') {
                        // Generate Visual Card
                        try {
                            const card = await generateLevelUpCard(user, oldLevel, newLevel);
                            await channel.send({ content: pingContent, files: [card] }).catch(() => null);
                        } catch(e) {
                            console.error('Failed to generate level up card:', e);
                            // Fallback to text
                            const embed = new EmbedBuilder()
                                .setColor('#57F287')
                                .setTitle('🎉 Level Up!')
                                .setDescription(customText);
                            await channel.send({ content: pingContent, embeds: [embed] }).catch(() => null);
                        }
                    } else {
                        // Send Text Message
                        const embed = new EmbedBuilder()
                            .setColor('#57F287')
                            .setTitle('🎉 Level Up!')
                            .setDescription(customText);
                        await channel.send({ content: pingContent, embeds: [embed] }).catch(() => null);
                    }
                }
            }
        }
    }
};