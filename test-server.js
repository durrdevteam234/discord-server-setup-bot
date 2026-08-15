require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const express = require('express');
const path = require('path');
const fs = require('fs');
const { Client, Collection, GatewayIntentBits, REST, Routes } = require('discord.js');

const app = express();
app.use(express.json());

const TEST_PORT = process.env.TEST_PORT || 9876;

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const commandsPath = path.join(__dirname, 'src', 'commands');
if (fs.existsSync(commandsPath)) {
  const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));
  for (const file of commandFiles) {
    try {
      const command = require(path.join(commandsPath, file));
      const name = command.name || command.data?.name;
      if (name) {
        client.commands.set(name.toLowerCase(), command);
      }
    } catch (err) {
      console.error(`Failed to load ${file}:`, err.message);
    }
  }
}

app.get('/test/commands', (req, res) => {
  const cmds = [];
  client.commands.forEach((cmd, key) => {
    cmds.push({
      key,
      name: cmd.name || cmd.data?.name,
      hasExecute: typeof cmd.execute === 'function',
      hasExecuteSlash: typeof cmd.executeSlash === 'function',
      hasHandleInteraction: typeof cmd.handleInteraction === 'function',
      hasInit: typeof cmd.init === 'function',
    });
  });
  res.json({ count: cmds.length, commands: cmds });
});

app.get('/test/commands/:name', (req, res) => {
  const cmd = client.commands.get(req.params.name.toLowerCase());
  if (!cmd) return res.status(404).json({ error: 'Command not found' });
  res.json({
    name: cmd.name || cmd.data?.name,
    description: cmd.data?.description,
    options: cmd.data?.options?.map(o => ({ name: o.name, type: o.type, required: o.required })),
    hasExecute: typeof cmd.execute === 'function',
    hasExecuteSlash: typeof cmd.executeSlash === 'function',
    hasHandleInteraction: typeof cmd.handleInteraction === 'function',
  });
});

app.post('/test/commands/:name/invoke', async (req, res) => {
  const cmd = client.commands.get(req.params.name.toLowerCase());
  if (!cmd) return res.status(404).json({ error: 'Command not found' });

  const mockInteraction = {
    isChatInputCommand: () => true,
    isCommand: () => false,
    isButton: () => false,
    isStringSelectMenu: () => false,
    isModalSubmit: () => false,
    user: { id: '123456789', tag: 'testuser#0000', username: 'testuser', displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png', avatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png' },
    member: { 
      id: '123456789',
      permissions: { has: (perm) => true },
      user: { id: '123456789', tag: 'testuser#0000', username: 'testuser', displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/0.png' }
    },
    guild: { id: '987654321', name: 'Test Guild' },
    guildId: '987654321',
    channel: { id: '123456', name: 'test-channel' },
    options: {
      getSubcommand: () => req.body.subcommand || null,
      getSubcommandGroup: () => null,
      getString: (name) => req.body.options?.[name] || null,
      getInteger: (name) => req.body.options?.[name] || null,
      getBoolean: (name) => req.body.options?.[name] ?? null,
      getChannel: (name) => req.body.options?.[name] ? { id: req.body.options[name], name: 'test-channel' } : null,
      getRole: (name) => req.body.options?.[name] ? { id: req.body.options[name], name: 'test-role' } : null,
      getUser: (name) => req.body.options?.[name] ? { id: req.body.options[name], tag: 'testuser2#0000', username: 'testuser2' } : null,
      getMember: (name) => req.body.options?.[name] ? { id: req.body.options[name], user: { id: req.body.options[name], tag: 'testuser2#0000', username: 'testuser2' } } : null,
    },
    commandName: cmd.name || cmd.data?.name,
    deferred: false,
    replied: false,
    reply: async (payload) => {
      return { ...payload, id: 'test-message-' + Date.now() };
    },
    editReply: async (payload) => {
      return { ...payload, id: 'test-message-' + Date.now() };
    },
    deferReply: async (opts) => {
      mockInteraction.deferred = true;
      return null;
    },
    followUp: async (payload) => {
      return { ...payload, id: 'test-message-' + Date.now() };
    },
    fetchReply: async () => ({ 
      id: 'test-message-' + Date.now(),
      createMessageComponentCollector: () => ({
        on: () => {},
        stop: () => {},
      }),
    }),
    createMessageComponentCollector: () => ({
      on: () => {},
      stop: () => {},
    }),
    client: { commands: client.commands },
  };

  const startTime = Date.now();
  try {
    let result;
    if (typeof cmd.executeSlash === 'function') {
      result = await cmd.executeSlash(mockInteraction, client);
    } else if (typeof cmd.execute === 'function') {
      result = await cmd.execute(mockInteraction, client);
    } else {
      return res.status(400).json({ error: 'Command has no execute or executeSlash method' });
    }
    const duration = Date.now() - startTime;
    res.json({ success: true, duration, result: result || 'executed' });
  } catch (error) {
    const duration = Date.now() - startTime;
    res.status(500).json({ success: false, duration, error: error.message, stack: error.stack });
  }
});

app.get('/test/deploy-status', async (req, res) => {
  try {
    const TOKEN = process.env.DISCORD_TOKEN;
    const CLIENT_ID = process.env.CLIENT_ID;
    
    if (!TOKEN || !CLIENT_ID) {
      return res.json({ status: 'error', message: 'Missing DISCORD_TOKEN or CLIENT_ID' });
    }

    const rest = new REST({ version: '10' }).setToken(TOKEN);
    const commands = await rest.get(Routes.applicationCommands(CLIENT_ID));
    
    res.json({
      status: 'ok',
      deployedCount: commands.length,
      commands: commands.map(c => ({ name: c.name, type: c.type, id: c.id })),
    });
  } catch (error) {
    res.json({ status: 'error', message: error.message });
  }
});

app.get('/test/discord-login', async (req, res) => {
  const TOKEN = (process.env.DISCORD_TOKEN || process.env.TOKEN || '').trim();
  if (!TOKEN) {
    return res.json({ status: 'error', message: 'Missing DISCORD_TOKEN/TOKEN' });
  }

  const testClient = new Client({ intents: [GatewayIntentBits.Guilds] });
  const result = {
    status: 'unknown',
    loginResolved: false,
    readyFired: false,
    wsStatus: null,
    closeCode: null,
    closeReason: null,
    error: null,
    duration: 0,
  };

  const startTime = Date.now();

  const timeout = setTimeout(() => {
    testClient.destroy();
    result.status = 'timeout';
    result.error = 'Login/ready did not complete within 15s';
    result.duration = Date.now() - startTime;
    res.json(result);
  }, 15000);

  testClient.once('ready', () => {
    result.status = 'success';
    result.loginResolved = true;
    result.readyFired = true;
    result.wsStatus = testClient.ws?.status;
    clearTimeout(timeout);
    testClient.destroy();
    result.duration = Date.now() - startTime;
    res.json(result);
  });

  testClient.on('error', (err) => {
    result.error = err.message;
  });

  testClient.on('disconnect', (packet) => {
    result.closeCode = packet?.code;
    result.closeReason = packet?.reason;
  });

  testClient.on('close', (packet) => {
    result.closeCode = packet;
    if (!result.readyFired && result.status !== 'timeout') {
      result.status = 'closed';
      clearTimeout(timeout);
      testClient.destroy();
      result.duration = Date.now() - startTime;
      res.json(result);
    }
  });

  try {
    await testClient.login(TOKEN);
    result.loginResolved = true;
  } catch (err) {
    result.status = 'login_error';
    result.error = err.message;
    clearTimeout(timeout);
    testClient.destroy();
    result.duration = Date.now() - startTime;
    res.json(result);
  }
});

app.get('/test/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    commandsLoaded: client.commands.size,
    timestamp: new Date().toISOString(),
  });
});

app.listen(TEST_PORT, () => {
  console.log(`🧪 Test server running on port ${TEST_PORT}`);
  console.log(`   Health:  http://localhost:${TEST_PORT}/test/health`);
  console.log(`   Commands: http://localhost:${TEST_PORT}/test/commands`);
  console.log(`   Deploy status: http://localhost:${TEST_PORT}/test/deploy-status`);
});
