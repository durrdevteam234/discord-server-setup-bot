module.exports = {
    name: 'messageReactionRemove',
    async execute(reaction, user, client) {
        try {
            if (reaction.partial) await reaction.fetch().catch(() => null);
            if (reaction.message.partial) await reaction.message.fetch().catch(() => null);
        } catch { return; }

        const starboardCmd = client.commands.get('starboard');
        if (starboardCmd?.handleReaction) {
            await starboardCmd.handleReaction(reaction, user, false, client).catch(() => null);
        }
    },
};
