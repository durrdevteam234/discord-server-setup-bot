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

const data = new SlashCommandBuilder()
  .setName("role")
  .setDescription("Role management system");

function embed(color = "#5865F2") {
  return new EmbedBuilder().setColor(color).setTimestamp();
}

function missingPerms(msg, perm) {
  return msg.reply({ embeds: [embed("#ED4245").setTitle("Missing Permissions").setDescription(`You need the **${perm}** permission to use this.`)] });
}

function botMissingPerms(msg, perm) {
  return msg.reply({ embeds: [embed("#ED4245").setTitle("Bot Missing Permissions").setDescription(`I need the **${perm}** permission to do this.`)] });
}

function usage(msg, sub, syntax) {
  return msg.reply({ embeds: [embed("#FEE75C").setTitle(`Usage — ${PREFIX}role ${sub}`).setDescription(`\`\`\`${syntax}\`\`\``)] });
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

function canManageRole(guild, role) {
  return guild.members.me.roles.highest.comparePositionTo(role) > 0;
}

async function runPrefix(msg, args) {
  if (!msg.guild) return;

  const sub = (args[0] || "").toLowerCase();

  if (!sub || !SUBCOMMANDS[sub]) {
    const list = Object.entries(SUBCOMMANDS).map(([k, v]) => `\`${PREFIX}role ${k}\` — ${v}`).join("\n");
    return msg.reply({
      embeds: [embed().setTitle("Role Management").setDescription(list).setFooter({ text: "Angle brackets = required  |  Square brackets = optional" })],
    });
  }

  if (sub === "user") {
    if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) return missingPerms(msg, "Manage Roles");
    if (!msg.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) return botMissingPerms(msg, "Manage Roles");
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
    if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) return missingPerms(msg, "Manage Roles");
    if (!msg.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) return botMissingPerms(msg, "Manage Roles");
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
    if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) return missingPerms(msg, "Manage Roles");
    if (!msg.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) return botMissingPerms(msg, "Manage Roles");
    if (args.length < 2) return usage(msg, "create", `${PREFIX}role create <name> [color] [hoist: yes/no] [mentionable: yes/no]`);

    const name        = args[1];
    const color       = args[2] || null;
    const hoist       = args[3] ? args[3].toLowerCase() === "yes" : false;
    const mentionable = args[4] ? args[4].toLowerCase() === "yes" : false;

    const options = { name, hoist, mentionable };
    if (color) options.color = color;

    let role;
    try { role = await msg.guild.roles.create(options); }
    catch { return msg.reply("Failed to create role. Check the color value (use `#RRGGBB`)."); }

    return msg.reply({
      embeds: [embed("#57F287").setTitle("Role Created").addFields(
        { name: "Name",        value: role.name,                   inline: true },
        { name: "Color",       value: role.hexColor,               inline: true },
        { name: "Hoisted",     value: hoist       ? "Yes" : "No", inline: true },
        { name: "Mentionable", value: mentionable ? "Yes" : "No", inline: true },
        { name: "ID",          value: role.id,                     inline: true }
      )],
    });
  }

  if (sub === "delete") {
    if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) return missingPerms(msg, "Manage Roles");
    if (!msg.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) return botMissingPerms(msg, "Manage Roles");
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
    if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) return missingPerms(msg, "Manage Roles");
    if (!msg.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) return botMissingPerms(msg, "Manage Roles");
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

  if (sub === "bots") {
    if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) return missingPerms(msg, "Manage Roles");
    if (!msg.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) return botMissingPerms(msg, "Manage Roles");
    if (args.length < 2) return usage(msg, "bots", `${PREFIX}role bots <@role>`);

    const role = resolveRole(msg.guild, args[1]);
    if (!role) return msg.reply("Could not find that role.");
    if (!canManageRole(msg.guild, role)) return msg.reply("That role is at or above my highest role.");

    await msg.guild.members.fetch();
    const bots = msg.guild.members.cache.filter((m) => m.user.bot && !m.roles.cache.has(role.id));
    const statusMsg = await msg.reply(`Adding ${role} to ${bots.size} bot(s)...`);

    let success = 0, failed = 0;
    for (const [, m] of bots) {
      try { await m.roles.add(role); success++; } catch { failed++; }
    }

    return statusMsg.edit({
      content: null,
      embeds: [embed("#57F287").setTitle("Role — Bots").addFields(
        { name: "Role", value: `${role}`, inline: true },
        { name: "Added", value: `${success}`, inline: true },
        { name: "Failed", value: `${failed}`, inline: true }
      )],
    });
  }

  if (sub === "humans") {
    if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) return missingPerms(msg, "Manage Roles");
    if (!msg.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) return botMissingPerms(msg, "Manage Roles");
    if (args.length < 2) return usage(msg, "humans", `${PREFIX}role humans <@role>`);

    const role = resolveRole(msg.guild, args[1]);
    if (!role) return msg.reply("Could not find that role.");
    if (!canManageRole(msg.guild, role)) return msg.reply("That role is at or above my highest role.");

    await msg.guild.members.fetch();
    const humans = msg.guild.members.cache.filter((m) => !m.user.bot && !m.roles.cache.has(role.id));
    const statusMsg = await msg.reply(`Adding ${role} to ${humans.size} human member(s)...`);

    let success = 0, failed = 0;
    for (const [, m] of humans) {
      try { await m.roles.add(role); success++; } catch { failed++; }
    }

    return statusMsg.edit({
      content: null,
      embeds: [embed("#57F287").setTitle("Role — Humans").addFields(
        { name: "Role", value: `${role}`, inline: true },
        { name: "Added", value: `${success}`, inline: true },
        { name: "Failed", value: `${failed}`, inline: true }
      )],
    });
  }

  if (sub === "info") {
    if (args.length < 2) return usage(msg, "info", `${PREFIX}role info <@role>`);

    const role = resolveRole(msg.guild, args[1]);
    if (!role) return msg.reply("Could not find that role.");

    await msg.guild.members.fetch();
    const memberCount = msg.guild.members.cache.filter((m) => m.roles.cache.has(role.id)).size;

    return msg.reply({
      embeds: [embed(role.color || "#5865F2").setTitle(`Role Info — ${role.name}`).addFields(
        { name: "ID",          value: role.id,                                               inline: true },
        { name: "Color",       value: role.hexColor,                                         inline: true },
        { name: "Members",     value: `${memberCount}`,                                      inline: true },
        { name: "Hoisted",     value: role.hoist       ? "Yes" : "No",                       inline: true },
        { name: "Mentionable", value: role.mentionable ? "Yes" : "No",                       inline: true },
        { name: "Managed",     value: role.managed     ? "Yes" : "No",                       inline: true },
        { name: "Position",    value: `${role.position}`,                                    inline: true },
        { name: "Created",     value: `<t:${Math.floor(role.createdTimestamp / 1000)}:R>`,   inline: true }
      )],
    });
  }

  if (sub === "list") {
    const sorted = msg.guild.roles.cache
      .filter((r) => r.id !== msg.guild.id)
      .sort((a, b) => b.position - a.position);

    const lines = sorted.map((r) => `${r} \`${r.id}\``);
    const chunks = [];
    let current = "";

    for (const line of lines) {
      if ((current + "\n" + line).length > 3900) { chunks.push(current); current = line; }
      else { current += (current ? "\n" : "") + line; }
    }
    if (current) chunks.push(current);

    const embeds = chunks.map((chunk, i) =>
      embed().setTitle(i === 0 ? `Roles — ${msg.guild.name} (${sorted.size})` : null).setDescription(chunk)
    );
    return msg.reply({ embeds: embeds.slice(0, 10) });
  }

  if (sub === "color") {
    if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) return missingPerms(msg, "Manage Roles");
    if (!msg.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) return botMissingPerms(msg, "Manage Roles");
    if (args.length < 3) return usage(msg, "color", `${PREFIX}role color <@role> <#hexcolor>`);

    const role = resolveRole(msg.guild, args[1]);
    if (!role) return msg.reply("Could not find that role.");
    if (!canManageRole(msg.guild, role)) return msg.reply("That role is at or above my highest role.");

    try { await role.setColor(args[2]); }
    catch { return msg.reply("Invalid color. Use a hex code like `#FF0000`."); }

    return msg.reply({ embeds: [embed(role.color).setTitle("Role Color Updated").setDescription(`${role} is now **${role.hexColor}**.`)] });
  }

  if (sub === "rename") {
    if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) return missingPerms(msg, "Manage Roles");
    if (!msg.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) return botMissingPerms(msg, "Manage Roles");
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
    if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) return missingPerms(msg, "Manage Roles");
    if (!msg.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) return botMissingPerms(msg, "Manage Roles");
    if (args.length < 2) return usage(msg, "hoist", `${PREFIX}role hoist <@role>`);

    const role = resolveRole(msg.guild, args[1]);
    if (!role) return msg.reply("Could not find that role.");
    if (!canManageRole(msg.guild, role)) return msg.reply("That role is at or above my highest role.");

    await role.setHoist(!role.hoist);
    return msg.reply({
      embeds: [embed("#57F287").setTitle("Role Hoist Toggled").setDescription(
        `${role} is now ${role.hoist ? "**hoisted** (shown separately in member list)" : "**not hoisted**"}.`
      )],
    });
  }

  if (sub === "mentionable") {
    if (!msg.member.permissions.has(PermissionFlagsBits.ManageRoles)) return missingPerms(msg, "Manage Roles");
    if (!msg.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)) return botMissingPerms(msg, "Manage Roles");
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

module.exports = { data, execute: async () => {}, runPrefix };

