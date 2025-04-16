import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  VoiceConnection,
} from '@discordjs/voice';
import { VoiceBasedChannel } from 'discord.js';
import { createReadStream } from 'fs';

export class MusicPlayer {
  private connection: VoiceConnection | null = null;
  private audioPlayer: AudioPlayer;
  private queue: string[] = [];
  private isPlaying = false;
  private isLooping = false;
  private currentTrack: string | null = null;

  constructor() {
    this.audioPlayer = createAudioPlayer();
    
    this.audioPlayer.on(AudioPlayerStatus.Idle, () => {
      this.isPlaying = false;
      if (this.isLooping && this.currentTrack) {
        this.playAgain();
      } else {
        this.playNext();
      }
    });
  }

  public async join(channel: VoiceBasedChannel): Promise<boolean> {
    try {
      this.connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });
      
      this.connection.subscribe(this.audioPlayer);
      return true;
    } catch (error) {
      console.error('Error joining voice channel:', error);
      return false;
    }
  }

  public addToQueue(filePath: string) {
    this.queue.push(filePath);
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  private playTrack(filePath: string) {
    try {
      const stream = createReadStream(filePath);
      const resource = createAudioResource(stream);
      
      this.audioPlayer.play(resource);
      this.isPlaying = true;
    } catch (error) {
      console.error('Error playing audio:', error);
      if (this.isLooping) {
        this.playAgain();
      } else {
        this.playNext();
      }
    }
  }

  public playNext() {
    if (this.queue.length === 0) return;

    const filePath = this.queue.shift();
    if (!filePath) return;

    this.currentTrack = filePath;
    this.playTrack(filePath);
  }

  private playAgain() {
    if (!this.currentTrack) return;
    this.playTrack(this.currentTrack);
  }

  public stop() {
    this.queue = [];
    this.audioPlayer.stop();
    this.isPlaying = false;
    this.currentTrack = null;
  }

  public toggleLoop(): boolean {
    this.isLooping = !this.isLooping;
    return this.isLooping;
  }

  public isLoopEnabled(): boolean {
    return this.isLooping;
  }

  public disconnect() {
    this.stop();
    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
    }
  }
}
