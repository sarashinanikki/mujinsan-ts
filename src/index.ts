import { Client, Events, GatewayIntentBits } from 'discord.js';
import * as dotenv from 'dotenv';
import { join } from 'path';
import { MusicPlayer } from './MusicPlayer';

// Load environment variables
dotenv.config();

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildVoiceStates,  // 音声機能に必要
  ],
});

// Music players for each guild
const musicPlayers = new Map<string, MusicPlayer>();

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
});

// Handle messages
client.on(Events.MessageCreate, async (message) => {
  // Ignore messages from bots
  if (message.author.bot) return;

  // Simple ping command
  if (message.content === '!ping') {
    await message.reply('Pong!');
    return;
  }

  // Music commands
  if (message.content.startsWith('!play')) {
    // Check if user is in a voice channel
    if (!message.member?.voice.channel) {
      await message.reply('ボイスチャンネルに参加してから実行してください！');
      return;
    }

    let source: string;
    const arg = message.content.slice(6).trim();

    if (!arg) {
      // 引数がない場合はデフォルトの音声ファイルを再生
      source = join(__dirname, '../music/001.mp3');
    } else if (arg.startsWith('http')) {
      // URLの場合はそのまま使用
      source = arg;
    } else {
      // ファイル名が指定された場合は、musicディレクトリから探す
      source = join(__dirname, '../music', arg);
    }

    // Get or create music player for this guild
    let player = musicPlayers.get(message.guildId!);
    if (!player) {
      player = new MusicPlayer();
      musicPlayers.set(message.guildId!, player);
    }

    // Join voice channel if not already joined
    const joined = await player.join(message.member.voice.channel);
    if (!joined) {
      await message.reply('ボイスチャンネルへの参加に失敗しました。');
      return;
    }

    // Add song to queue
    player.addToQueue(source);
    await message.reply('再生を開始します！');
  }

  // Stop command
  if (message.content === '!stop') {
    const player = musicPlayers.get(message.guildId!);
    if (player) {
      player.stop();
      await message.reply('再生を停止しました。');
    }
  }

  // Loop command
  if (message.content === '!loop') {
    const player = musicPlayers.get(message.guildId!);
    if (player) {
      const isLooping = player.toggleLoop();
      await message.reply(isLooping ? 'ループ再生を有効にしました。' : 'ループ再生を無効にしました。');
    }
  }

  // Disconnect command
  if (message.content === '!disconnect') {
    const player = musicPlayers.get(message.guildId!);
    if (player) {
      player.disconnect();
      musicPlayers.delete(message.guildId!);
      await message.reply('ボイスチャンネルから切断しました。');
    }
  }
});

// Log in to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);
