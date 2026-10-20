// Discord only checks the bot's rank when the bot acts, so commands must also
// check the moderator's: without this, a low-ranked mod could use the bot to ban,
// kick, mute or warn people ranked above them.
function outranks(executor, target) {
  if (!executor || !target) return true;
  const ownerId = target.guild.ownerId;
  if (executor.id === ownerId) return true;
  if (target.id === ownerId || target.id === executor.id) return false;
  return executor.roles.highest.comparePositionTo(target.roles.highest) > 0;
}

module.exports = { outranks };

// For roles members can get from the bot (reaction roles, autoroles, level rewards,
// interest roles): the moderator setting them up must outrank the role, or a
// low-ranked mod could put an admin role on a public panel and grab it.
function outranksRole(member, role) {
  if (!member || !role) return false;
  if (role.managed) return false;
  if (member.id === role.guild.ownerId) return true;
  return member.roles.highest.comparePositionTo(role) > 0;
}

module.exports.outranksRole = outranksRole;
