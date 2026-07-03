const { PermissionFlagsBits, EmbedBuilder, SlashCommandBuilder } = require("discord.js");

const PREFIX = "|";

const SUBCOMMANDS = {
  user:        "Add a role to a specific user",
  remove:      "Remove a role from a specific user",
  create:      "Create a new role",
  delete:      "Delete an existing role",
  everyone:    "Add a role to every member",
  bots:        "Add a role to all bots",
  humans:      "Add a role to all non-bot members",
  info:        "Display info about a role",
  list:        "List all roles in the server",
  color:       "Change a role's color",
  rename:      "Rename an existing role",
  hoist:       "Toggle whether a role is hoisted",
  mentionable: "Toggle whether a role is mentionable",
};

// 1. COMPREHENSIVE SLASH COMMAND BUILDER REGISTER
const data = new SlashCommandBuilder()
  .setName("role")
  .setDescription("Role management system")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
  .setDMPermission(false)
  .addSubcommand(sub => sub
    .setName("user")
    .setDescription(SUBCOMMANDS.user)
    .addUserOption(opt => opt.setName("member").setDescription("The target member").setRequired(true))
    .addRoleOption(opt => opt.setName("role").setDescription("The role to add").setRequired(true))
  )
  .addSubcommand(sub => sub
    .setName("remove")
    .setDescription(SUBCOMMANDS.remove)
    .addUserOption(opt => opt.setName("member").setDescription("The target member").setRequired(true))
    .addRoleOption(opt => opt.setName("role").setDescription("The role to remove").setRequired(true))
  )
  .addSubcommand(sub => sub
    .setName("create")
    .setDescription(SUBCOMMANDS.create)
    .addStringOption(opt => opt.setName("name").setDescription("The name of the new role").setRequired(true))
    .addStringOption(opt => opt.setName("color").setDescription("The hex color code (e.g. #FF0000)").setRequired(false))
    .addBooleanOption(opt => opt.setName("hoist").setDescription("Display separately in sidebar?").setRequired(false))
    .addBooleanOption(opt => opt.setName("mentionable").setDescription("Can anyone mention this role?").setRequired(false))
  )
  .addSubcommand(sub => sub
    .setName("delete")
    .setDescription(SUBCOMMANDS.delete)
    .addRoleOption(opt => opt.setName("role").setDescription("The role to delete").setRequired(true))
  )
  .addSubcommand(sub => sub
    .setName("everyone")
    .setDescription(SUBCOMMANDS.everyone)
    .addRoleOption(opt => opt.setName("role").setDescription("The role to give to everyone").setRequired(true))
  )
  .addSubcommand(sub => sub
    .setName("bots")
    .setDescription(SUBCOMMANDS.bots)
    .addRoleOption(opt => opt.setName("role").setDescription("The role to give to all bots").setRequired(true))
  )
  .addSubcommand(sub => sub
    .setName("humans")
    .setDescription(SUBCOMMANDS.humans)
    .addRoleOption(opt => opt.setName("role").setDescription("The role to give to all human accounts").setRequired(true))
  )
  .addSubcommand(sub => sub
    .setName("info")
    .setDescription(SUBCOMMANDS.info)
    .addRoleOption(opt => opt.setName("role").setDescription("The target role").setRequired(true))
  )
  .addSubcommand(sub => sub
    .setName("list")
    .setDescription(SUBCOMMANDS.list)
  )
  .addSubcommand(sub => sub
    .setName("color")
    .setDescription(SUBCOMMANDS.color)
    .addRoleOption(opt => opt.setName("role").setDescription("The role to modify").setRequired(true))
    .addStringOption(opt => opt.setName("hex").setDescription("New hex color code (e.g. #FF0000)").setRequired(true))
  )
  .addSubcommand(sub => sub
    .setName("rename")
    .setDescription(SUBCOMMANDS.rename)
    .addRoleOption(opt => opt.setName("role").setDescription("The role to rename").setRequired(true))
    .addStringOption(opt => opt.setName("new_name").setDescription("The new name").setRequired(true))
  )
  .addSubcommand(sub => sub
    .setName("hoist")
    .setDescription(SUBCOMMANDS.hoist)
    .addRoleOption(opt => opt.setName("role").setDescription("The role to toggle hoist status").setRequired(true))
  )
  .addSubcommand(sub => sub
    .setName("mentionable")
    .setDescription(SUBCOMMANDS.mentionable)
    .addRoleOption(opt => opt.setName("role").setDescription("The role to toggle mention status").setRequired(true))
  );

// SYSTEM HELPERS
function embed(color = "#5865F2") {
  return new EmbedBuilder().setColor(color).setTimestamp();
}

function checkPermissions(context, isSlash = false) {
  const member = context.member;
  const me = context.guild.members.me;

  if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) {
    const err = embed("#ED4245").setTitle("Missing Permissions").setDescription("You need the **Manage Roles** permission.");
    return { valid: false, response: isSlash ? context.reply({ embeds: [err], ephemeral: true }) : context.reply({ embeds: [err] }) };
  }
  if (!me.permissions.has(PermissionFlagsBits.ManageRoles)) {
    const err = embed("#ED4245").setTitle("Bot Missing Permissions").setDescription("I need the **Manage Roles** permission.");
    return { valid: false, response: isSlash ? context.reply({ embeds: [err], ephemeral: true }) : context.reply({ embeds: [err] }) };
  }
  return { valid: true };
}

function canManageRole(guild, role) {
  return guild.members.me.roles.highest.comparePositionTo(role) > 0;
}

function resolveRole(guild, input) {
  if (!input) return null;
  const id = input.replace(/[<@&>]/g, "");
  return guild.roles.cache.get(id) || guild.roles.cache.find((r) => r.name.toLowerCase() === input.toLowerCase()) || null;
}

function resolveMember(guild, input) {
  if (!input) return null;
  const id = input.replace(/[<@!>]/g, "");
  return guild.members.cache.get(id) || null;
}

function usage(msg, sub, syntax) {
  return msg.reply({ embeds: [embed("#FEE75C").setTitle(`Usage — ${PREFIX}role ${sub}`).setDescription(`\`\`\`${syntax}\`\`\``)] });
}
// 2. SLASH COMMAND EXECUTION ROUTER
async function execute(interaction) {
  if (!interaction.guild) return;
  
  const permCheck = checkPermissions(interaction, true);
  if (!permCheck.valid) return;

  const sub = interaction.options.getSubcommand();

  if (sub === "user") {
    const member = interaction.options.getMember("member");
    const role = interaction.options.getRole("role");

    if (!member) return interaction.reply({ content: "Could not find that member.", ephemeral: true });
    if (!canManageRole(interaction.guild, role)) return interaction.reply({ content: "That role hierarchy is high up.", ephemeral: true });
    if (member.roles.cache.has(role.id)) return interaction.reply({ content: "Member already has role.", ephemeral: true });

    await member.roles.add(role);
    return interaction.reply({ embeds: [embed("#57F287").setTitle("Role Added").setDescription(`Added ${role} to ${member}.`)] });
  }

  if (sub === "remove") {
    const member = interaction.options.getMember("member");
    const role = interaction.options.getRole("role");

    if (!member) return interaction.reply({ content: "Could not find that member.", ephemeral: true });
    if (!canManageRole(interaction.guild, role)) return interaction.reply({ content: "That role hierarchy is high up.", ephemeral: true });
    if (!member.roles.cache.has(role.id)) return interaction.reply({ content: "Member doesn't have role.", ephemeral: true });

    await member.roles.remove(role);
    return interaction.reply({ embeds: [embed("#57F287").setTitle("Role Removed").setDescription(`Removed ${role} from ${member}.`)] });
  }

  if (sub === "create") {
    const name = interaction.options.getString("name");
    const color = interaction.options.getString("color") || null;
    const hoist = interaction.options.getBoolean("hoist") || false;
    const mentionable = interaction.options.getBoolean("mentionable") || false;

    try {
      const role = await interaction.guild.roles.create({ name, color, hoist, mentionable });
      return interaction.reply({ embeds: [embed("#57F287").setTitle("Role Created").setDescription(`Created role ${role}.`)] });
    } catch {
      return interaction.reply({ content: "Failed to create. Check hex structure.", ephemeral: true });
    }
  }

  if (sub === "delete") {
    const role = interaction.options.getRole("role");
    if (!canManageRole(interaction.guild, role)) return interaction.reply({ content: "Role hierarchy issue.", ephemeral: true });
    if (role.managed) return interaction.reply({ content: "Managed integration role.", ephemeral: true });

    await role.delete();
    return interaction.reply({ embeds: [embed("#57F287").setTitle("Role Deleted")] });
  }

  if (sub === "everyone") {
    const role = interaction.options.getRole("role");
    if (!canManageRole(interaction.guild, role)) return interaction.reply({ content: "Role hierarchy issue.", ephemeral: true });

    await interaction.deferReply();
    await interaction.guild.members.fetch();
    const targets = interaction.guild.members.cache.filter((m) => !m.roles.cache.has(role.id));

    let success = 0;
    for (const [, m] of targets) { try { await m.roles.add(role); success++; } catch {} }
    return interaction.editReply({ embeds: [embed("#57F287").setTitle("Mass Role Added").setDescription(`Added to ${success} members.`)] });
  }

  if (sub === "bots") {
    const role = interaction.options.getRole("role");
    if (!canManageRole(interaction.guild, role)) return interaction.reply({ content: "Role hierarchy issue.", ephemeral: true });

    await interaction.deferReply();
    await interaction.guild.members.fetch();
    const targets = interaction.guild.members.cache.filter((m) => m.user.bot && !m.roles.cache.has(role.id));

    let success = 0;
    for (const [, m] of targets) { try { await m.roles.add(role); success++; } catch {} }
    return interaction.editReply({ embeds: [embed("#57F287").setTitle("Bots Role Completed").setDescription(`Added to ${success} bot accounts.`)] });
  }

  if (sub === "humans") {
    const role = interaction.options.getRole("role");
    if (!canManageRole(interaction.guild, role)) return interaction.reply({ content: "Role hierarchy issue.", ephemeral: true });

    await interaction.deferReply();
    await interaction.guild.members.fetch();
    const targets = interaction.guild.members.cache.filter((m) => !m.user.bot && !m.roles.cache.has(role.id));

    let success = 0;
    for (const [, m] of targets) { try { await m.roles.add(role); success++; } catch {} }
    return interaction.editReply({ embeds: [embed("#57F287").setTitle("Humans Role Completed").setDescription(`Added to ${success} human accounts.`)] });
  }

  if (sub === "info") {
    const role = interaction.options.getRole("role");
    const infoEmbed = embed(role.hexColor)
      .setTitle(`Role Info: ${role.name}`)
      .addFields(
        { name: "ID", value: role.id, inline: true },
        { name: "Color", value: role.hexColor, inline: true },
        { name: "Members", value: `${role.members.size}`, inline: true },
        { name: "Hoisted", value: role.hoist ? "Yes" : "No", inline: true },
        { name: "Mentionable", value: role.mentionable ? "Yes" : "No", inline: true }
      );
    return interaction.reply({ embeds: [infoEmbed] });
  }

  if (sub === "list") {
    await interaction.guild.roles.fetch();
    const roles = interaction.guild.roles.cache
      .filter(r => r.id !== interaction.guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => `${r} — \`${r.members.size}\` members`).join("\n");

    return interaction.reply({ embeds: [embed().setTitle("Server Roles").setDescription(roles.slice(0, 4000) || "No roles found.")] });
  }

  if (sub === "color") {
    const role = interaction.options.getRole("role");
    const hex = interaction.options.getString("hex");
    if (!canManageRole(interaction.guild, role)) return interaction.reply({ content: "Role hierarchy issue.", ephemeral: true });

    try {
      await role.setColor(hex);
      return interaction.reply({ embeds: [embed(hex).setTitle("Color Updated")] });
    } catch {
      return interaction.reply({ content: "Invalid hex value structure.", ephemeral: true });
    }
  }

  if (sub === "rename") {
    const role = interaction.options.getRole("role");
    const newName = interaction.options.getString("new_name");
    if (!canManageRole(interaction.guild, role)) return interaction.reply({ content: "Role hierarchy issue.", ephemeral: true });

    await role.setName(newName);
    return interaction.reply({ embeds: [embed("#57F287").setTitle("Role Renamed")] });
  }

  if (sub === "hoist") {
    const role = interaction.options.getRole("role");
    if (!canManageRole(interaction.guild, role)) return interaction.reply({ content: "Role hierarchy issue.", ephemeral: true });

    await role.setHoist(!role.hoist);
    return interaction.reply({ embeds: [embed("#57F287").setTitle("Hoist Status Toggled")] });
  }

  if (sub === "mentionable") {
    const role = interaction.options.getRole("role");
    if (!canManageRole(interaction.guild, role)) return interaction.reply({ content: "Role hierarchy issue.", ephemeral: true });

    await role.setMentionable(!role.mentionable);
    return interaction.reply({ embeds: [embed("#57F287").setTitle("Mentionable Status Toggled")] });
  }
}
// 3. PREFIX COMMAND EXECUTION GATEWAY
async function runPrefix(msg, args) {
  if (!msg.guild) return;

  const sub = (args[0] || "").toLowerCase();

  if (!sub || !SUBCOMMANDS[sub]) {
    const list = Object.entries(SUBCOMMANDS).map(([k, v]) => `\`${PREFIX}role ${k}\` — ${v}`).join("\n");
    return msg.reply({ embeds: [embed().setTitle("Role System").setDescription(list)] });
  }

  const permCheck = checkPermissions(msg, false);
  if (!permCheck.valid) return;

  if (sub === "user") {
    if (args.length < 3) return usage(msg, "user", `${PREFIX}role user <@member> <@role>`);
    const member = resolveMember(msg.guild, args[1]);
    const role   = resolveRole(msg.guild, args[2]);

    if (!member || !role || !canManageRole(msg.guild, role)) return msg.reply("Invalid data targeting parameters configuration.");
    await member.roles.add(role);
    return msg.reply({ embeds: [embed("#57F287").setTitle("Role Added")] });
  }

  if (sub === "remove") {
    if (args.length < 3) return usage(msg, "remove", `${PREFIX}role remove <@member> <@role>`);
    const member = resolveMember(msg.guild, args[1]);
    const role   = resolveRole(msg.guild, args[2]);

    if (!member || !role || !canManageRole(msg.guild, role)) return msg.reply("Invalid target structural layout configurations.");
    await member.roles.remove(role);
    return msg.reply({ embeds: [embed("#57F287").setTitle("Role Removed")] });
  }

  if (sub === "create") {
    if (args.length < 2) return usage(msg, "create", `${PREFIX}role create <name> [hex]`);
    const name = args[1];
    const color = args[2] || null;
    try {
      const role = await msg.guild.roles.create({ name, color });
      return msg.reply({ embeds: [embed("#57F287").setTitle("Role Created").setDescription(`Role ${role} created.`)] });
    } catch { return msg.reply("Error handling configuration parameters parsing."); }
  }

  if (sub === "delete") {
    if (args.length < 2) return usage(msg, "delete", `${PREFIX}role delete <@role>`);
    const role = resolveRole(msg.guild, args[1]);
    if (!role || !canManageRole(msg.guild, role) || role.managed) return msg.reply("Cannot target system structural files.");
    await role.delete();
    return msg.reply({ embeds: [embed("#57F287").setTitle("Role Deleted")] });
  }

  if (sub === "everyone") {
    if (args.length < 2) return usage(msg, "everyone", `${PREFIX}role everyone <@role>`);
    const role = resolveRole(msg.guild, args[1]);
    if (!role || !canManageRole(msg.guild, role)) return msg.reply("Hierarchy configuration boundaries violation.");
    
    const loading = await msg.reply("Looping array tracking changes... this may take a while.");
    await msg.guild.members.fetch();
    const targets = msg.guild.members.cache.filter(m => !m.roles.cache.has(role.id));
    
    let ok = 0;
    for (const [, m] of targets) { try { await m.roles.add(role); ok++; } catch {} }
    return loading.edit({ content: `Complete! Added role to ${ok} structural accounts.` });
  }

  if (sub === "bots") {
    if (args.length < 2) return usage(msg, "bots", `${PREFIX}role bots <@role>`);
    const role = resolveRole(msg.guild, args[1]);
    if (!role || !canManageRole(msg.guild, role)) return msg.reply("Hierarchy check error.");
    
    const loading = await msg.reply("Processing bots context items...");
    await msg.guild.members.fetch();
    const targets = msg.guild.members.cache.filter(m => m.user.bot && !m.roles.cache.has(role.id));
    
    let ok = 0;
    for (const [, m] of targets) { try { await m.roles.add(role); ok++; } catch {} }
    return loading.edit({ content: `Complete! Added role to ${ok} bot accounts.` });
  }

  if (sub === "humans") {
    if (args.length < 2) return usage(msg, "humans", `${PREFIX}role humans <@role>`);
    const role = resolveRole(msg.guild, args[1]);
    if (!role || !canManageRole(msg.guild, role)) return msg.reply("Hierarchy check error.");
    
    const loading = await msg.reply("Processing humans context items...");
    await msg.guild.members.fetch();
    const targets = msg.guild.members.cache.filter(m => !m.user.bot && !m.roles.cache.has(role.id));
    
    let ok = 0;
    for (const [, m] of targets) { try { await m.roles.add(role); ok++; } catch {} }
    return loading.edit({ content: `Complete! Added role to ${ok} human accounts.` });
  }

  if (sub === "info") {
    if (args.length < 2) return usage(msg, "info", `${PREFIX}role info <@role>`);
    const role = resolveRole(msg.guild, args[1]);
    if (!role) return msg.reply("Could not identify the specific structural design profile metadata.");
    return msg.reply({ embeds: [embed(role.hexColor).setTitle(`Role info data: ${role.name}`).setDescription(`ID: ${role.id}\nColor: ${role.hexColor}\nMembers size context count: ${role.members.size}`)] });
  }

  if (sub === "list") {
    await msg.guild.roles.fetch();
    const lines = msg.guild.roles.cache.filter(r => r.id !== msg.guild.id).map(r => `${r} — \`${r.members.size}\` members`).join("\n");
    return msg.reply({ embeds: [embed().setTitle("Role List context").setDescription(lines.slice(0, 2000) || "Clear empty fields.")] });
  }

  if (sub === "color") {
    if (args.length < 3) return usage(msg, "color", `${PREFIX}role color <@role> <hex>`);
    const role = resolveRole(msg.guild, args[1]);
    const hex = args[2];
    if (!role || !canManageRole(msg.guild, role)) return msg.reply("Hierarchy error handling targets execution mapping.");
    try { await role.setColor(hex); return msg.reply("Role visual hex code layout configurations updated."); } catch { return msg.reply("Failed parameters tracking."); }
  }

  if (sub === "rename") {
    if (args.length < 3) return usage(msg, "rename", `${PREFIX}role rename <@role> <new name>`);
    const role = resolveRole(msg.guild, args[1]);
    const newName = args.slice(2).join(" ");
    if (!role || !canManageRole(msg.guild, role) || !newName) return msg.reply("Invalid execution formatting layout strings.");
    await role.setName(newName);
    return msg.reply("Successfully updated naming labels schema structural bounds.");
  }

  if (sub === "hoist") {
    if (args.length < 2) return usage(msg, "hoist", `${PREFIX}role hoist <@role>`);
    const role = resolveRole(msg.guild, args[1]);
    if (!role || !canManageRole(msg.guild, role)) return msg.reply("Hierarchy layout configuration constraints violation.");
    await role.setHoist(!role.hoist);
    return msg.reply("Toggled structural context sidebar layer successfully.");
  }

  if (sub === "mentionable") {
    if (args.length < 2) return usage(msg, "mentionable", `${PREFIX}role mentionable <@role>`);
    const role = resolveRole(msg.guild, args[1]);
    if (!role || !canManageRole(msg.guild, role)) return msg.reply("Hierarchy tracking mismatch configurations error runtime.");
    await role.setMentionable(!role.mentionable);
    return msg.reply("Toggled target layout mention tag constraints configurations parameters.");
  }
}

// COMPLETE MASTER ROUTER EXPORTS MAP OUT
module.exports = { data, execute, runPrefix };
