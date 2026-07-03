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

// SLASH COMMAND BUILDER REGISTER
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

// SHARED UTILITIES
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
// 2. SLASH COMMAND EXECUTION (FIXES INTERACTION TIMEOUTS)
async function execute(interaction) {
  if (!interaction.guild) return;
  
  const permCheck = checkPermissions(interaction, true);
  if (!permCheck.valid) return;

  const sub = interaction.options.getSubcommand();

  if (sub === "user") {
    const member = interaction.options.getMember("member");
    const role = interaction.options.getRole("role");

    if (!member) return interaction.reply({ content: "Could not find that member.", ephemeral: true });
    if (!canManageRole(interaction.guild, role)) return interaction.reply({ content: "That role is at or above my highest role.", ephemeral: true });
    if (member.roles.cache.has(role.id)) return interaction.reply({ content: `${member.user.tag} already has that role.`, ephemeral: true });

    await member.roles.add(role);
    return interaction.reply({ embeds: [embed("#57F287").setTitle("Role Added").setDescription(`Added ${role} to ${member}.`)] });
  }

  if (sub === "remove") {
    const member = interaction.options.getMember("member");
    const role = interaction.options.getRole("role");

    if (!member) return interaction.reply({ content: "Could not find that member.", ephemeral: true });
    if (!canManageRole(interaction.guild, role)) return interaction.reply({ content: "That role is at or above my highest role.", ephemeral: true });
    if (!member.roles.cache.has(role.id)) return interaction.reply({ content: `${member.user.tag} does not have that role.`, ephemeral: true });

    await member.roles.remove(role);
    return interaction.reply({ embeds: [embed("#57F287").setTitle("Role Removed").setDescription(`Removed ${role} from ${member}.`)] });
  }

  if (sub === "create") {
    const name = interaction.options.getString("name");
    const color = interaction.options.getString("color") || null;
    const hoist = interaction.options.getBoolean("hoist") || false;
    const mentionable = interaction.options.getBoolean("mentionable") || false;

    const options = { name, hoist, mentionable };
    if (color) options.color = color;

    try {
      const role = await interaction.guild.roles.create(options);
      return interaction.reply({
        embeds: [embed("#57F287").setTitle("Role Created").addFields(
          { name: "Name",        value: role.name,                   inline: true },
          { name: "Color",       value: role.hexColor,               inline: true },
          { name: "Hoisted",     value: hoist ? "Yes" : "No",        inline: true },
          { name: "Mentionable", value: mentionable ? "Yes" : "No",  inline: true },
          { name: "ID",          value: role.id,                     inline: true }
        )],
      });
    } catch {
      return interaction.reply({ content: "Failed to create role. Check color hex format (e.g. #FF0000).", ephemeral: true });
    }
  }

  if (sub === "delete") {
    const role = interaction.options.getRole("role");
    if (!canManageRole(interaction.guild, role)) return interaction.reply({ content: "That role is at or above my highest role.", ephemeral: true });
    if (role.managed) return interaction.reply({ content: "That role is managed by an integration.", ephemeral: true });

    const roleName = role.name;
    await role.delete();
    return interaction.reply({ embeds: [embed("#57F287").setTitle("Role Deleted").setDescription(`The role **${roleName}** has been deleted.`)] });
  }

  if (sub === "everyone") {
    const role = interaction.options.getRole("role");
    if (!canManageRole(interaction.guild, role)) return interaction.reply({ content: "That role is at or above my highest role.", ephemeral: true });

    await interaction.deferReply(); // Gives bot up to 15 minutes to loop members safely
    await interaction.guild.members.fetch();
    const targets = interaction.guild.members.cache.filter((m) => !m.roles.cache.has(role.id));

    let success = 0, failed = 0;
    for (const [, m] of targets) {
      try { await m.roles.add(role); success++; } catch { failed++; }
    }

    return interaction.editReply({
      embeds: [embed("#57F287").setTitle("Role — Everyone").addFields(
        { name: "Role", value: `${role}`, inline: true },
        { name: "Added", value: `${success}`, inline: true },
        { name: "Failed", value: `${failed}`, inline: true }
      )],
    });
  }

  if (sub === "rename") {
    const role = interaction.options.getRole("role");
    const newName = interaction.options.getString("new_name");

    if (!canManageRole(interaction.guild, role)) return interaction.reply({ content: "That role is at or above my highest role.", ephemeral: true });

    const oldName = role.name;
    await role.setName(newName);
    return interaction.reply({ embeds: [embed("#57F287").setTitle("Role Renamed").setDescription(`**${oldName}** → **${newName}**`)] });
  }

  if (sub === "hoist") {
    const role = interaction.options.getRole("role");
    if (!canManageRole(interaction.guild, role)) return interaction.reply({ content: "That role is at or above my highest role.", ephemeral: true });

    await role.setHoist(!role.hoist);
    return interaction.reply({
      embeds: [embed("#57F287").setTitle("Role Hoist Toggled").setDescription(
        `${role} is now ${role.hoist ? "**hoisted**" : "**not hoisted**"}.`
      )],
    });
  }

  if (sub === "mentionable") {
    const role = interaction.options.getRole("role");
    if (!canManageRole(interaction.guild, role)) return interaction.reply({ content: "That role is at or above my highest role.", ephemeral: true });

    await role.setMentionable(!role.mentionable);
    return interaction.reply({
      embeds: [embed("#57F287").setTitle("Role Mentionable Toggled").setDescription(
        `${role} is now ${role.mentionable ? "**mentionable**" : "**not mentionable**"}.`
      )],
    });
  }
}
// 3. PREFIX COMMAND EXECUTION
async function runPrefix(msg, args) {
  if (!msg.guild) return;

  const sub = (args[0] || "").toLowerCase();

  if (!sub || !SUBCOMMANDS[sub]) {
    const list = Object.entries(SUBCOMMANDS).map(([k, v]) => `\`${PREFIX}role ${k}\` — ${v}`).join("\n");
    return msg.reply({
      embeds: [embed().setTitle("Role Management").setDescription(list).setFooter({ text: "Angle brackets = required  |  Square brackets = optional" })],
    });
  }

  const permCheck = checkPermissions(msg, false);
  if (!permCheck.valid) return;

  if (sub === "user") {
    if (args.length < 3) return usage(msg, "user", `${PREFIX}role user <@member> <@role>`);
    const member = resolveMember(msg.guild, args[1]);
    const role   = resolveRole(msg.guild, args[2]);

    if (!member) return msg.reply("Could not find that member.");
    if (!role)   return msg.reply("Could not find that role.");
    if (!canManageRole(msg.guild, role)) return msg.reply("That role is at or above my highest role.");
    if (member.roles.cache.has(role.id)) return msg.reply(`${member.user.tag} already has that role.`);

    await member.roles.add(role);
    return msg.reply({ embeds: [embed("#57F287").setTitle("Role Added").setDescription(`Added ${role} to ${member}.`)] });
  }

  if (sub === "remove") {
    if (args.length < 3) return usage(msg, "remove", `${PREFIX}role remove <@member> <@role>`);
    const member = resolveMember(msg.guild, args[1]);
    const role   = resolveRole(msg.guild, args[2]);

    if (!member) return msg.reply("Could not find that member.");
    if (!role)   return msg.reply("Could not find that role.");
    if (!canManageRole(msg.guild, role)) return msg.reply("That role is at or above my highest role.");
    if (!member.roles.cache.has(role.id)) return msg.reply(`${member.user.tag} does not have that role.`);

    await member.roles.remove(role);
    return msg.reply({ embeds: [embed("#57F287").setTitle("Role Removed").setDescription(`Removed ${role} from ${member}.`)] });
  }

  if (sub === "create") {
    if (args.length < 2) return usage(msg, "create", `${PREFIX}role create <name> [color] [hoist: yes/no] [mentionable: yes/no]`);
    const name        = args[1];
    const color       = args[2] || null;
    const hoist       = args[3] ? args[3].toLowerCase() === "yes" : false;
    const mentionable = args[4] ? args[4].toLowerCase() === "yes" : false;

    const options = { name, hoist, mentionable };
    if (color) options.color = color;

    try {
      const role = await msg.guild.roles.create(options);
      return msg.reply({
        embeds: [embed("#57F287").setTitle("Role Created").addFields(
          { name: "Name",        value: role.name,                   inline: true },
          { name: "Color",       value: role.hexColor,               inline: true },
          { name: "Hoisted",     value: hoist       ? "Yes" : "No", inline: true },
          { name: "Mentionable", value: mentionable ? "Yes" : "No", inline: true },
          { name: "ID",          value: role.id,                     inline: true }
        )],
      });
    } catch {
      return msg.reply("Failed to create role. Check the color value (use `#RRGGBB`).");
    }
  }

  if (sub === "delete") {
    if (args.length < 2) return usage(msg, "delete", `${PREFIX}role delete <@role>`);
    const role = resolveRole(msg.guild, args[1]);
    if (!role) return msg.reply("Could not find that role.");
    if (!canManageRole(msg.guild, role)) return msg.reply("That role is at or above my highest role.");
    if (role.managed) return msg.reply("That role is managed by an integration and cannot be deleted.");

    const roleName = role.name;
    await role.delete();
    return msg.reply({ embeds: [embed("#57F287").setTitle("Role Deleted").setDescription(`The role **${roleName}** has been deleted.`)] });
  }

  if (sub === "everyone") {
    if (args.length < 2) return usage(msg, "everyone", `${PREFIX}role everyone <@role>`);
    const role = resolveRole(msg.guild, args[1]);
    if (!role) return msg.reply("Could not find that role.");
    if (!canManageRole(msg.guild, role)) return msg.reply("That role is at or above my highest role.");

    const statusMsg = await msg.reply(`Adding ${role} to all members... this may take a while.`);
    await msg.guild.members.fetch();
    const targets = msg.guild.members.cache.filter((m) => !m.roles.cache.has(role.id));

    let success = 0, failed = 0;
    for (const [, m] of targets) {
      try { await m.roles.add(role); success++; } catch { failed++; }
    }

    return statusMsg.edit({
      content: null,
      embeds: [embed("#57F287").setTitle("Role — Everyone").addFields(
        { name: "Role", value: `${role}`, inline: true },
        { name: "Added", value: `${success}`, inline: true },
        { name: "Failed", value: `${failed}`, inline: true }
      )],
    });
  }

  if (sub === "rename") {
    if (args.length < 3) return usage(msg, "rename", `${PREFIX}role rename <@role> <new name>`);
    const role = resolveRole(msg.guild, args[1]);
    if (!role) return msg.reply("Could not find that role.");
    if (!canManageRole(msg.guild, role)) return msg.reply("That role is at or above my highest role.");

    const oldName = role.name;
    const newName = args.slice(2).join(" ");
    await role.setName(newName);
    return msg.reply({ embeds: [embed("#57F287").setTitle("Role Renamed").setDescription(`**${oldName}** → **${newName}**`)] });
  }

  if (sub === "hoist") {
    if (args.length < 2) return usage(msg, "hoist", `${PREFIX}role hoist <@role>`);
    const role = resolveRole(msg.guild, args[1]);
    if (!role) return msg.reply("Could not find that role.");
    if (!canManageRole(msg.guild, role)) return msg.reply("That role is at or above my highest role.");

    await role.setHoist(!role.hoist);
    return msg.reply({
      embeds: [embed("#57F287").setTitle("Role Hoist Toggled").setDescription(
        `${role} is now ${role.hoist ? "**hoisted**" : "**not hoisted**"}.`
      )],
    });
  }

  if (sub === "mentionable") {
    if (args.length < 2) return usage(msg, "mentionable", `${PREFIX}role mentionable <@role>`);
    const role = resolveRole(msg.guild, args[1]);
    if (!role) return msg.reply("Could not find that role.");
    if (!canManageRole(msg.guild, role)) return msg.reply("That role is at or above my highest role.");

    await role.setMentionable(!role.mentionable);
    return msg.reply({
      embeds: [embed("#57F287").setTitle("Role Mentionable Toggled").setDescription(
        `${role} is now ${role.mentionable ? "**mentionable**" : "**not mentionable**"}.`
      )],
    });
  }
}

// EXPORT ALL FUNCTIONALITY TO COMMAND HANDLERS
module.exports = { data, execute, runPrefix };
