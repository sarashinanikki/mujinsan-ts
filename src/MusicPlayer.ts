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
import { existsSync } from 'fs';
import * as play from 'play-dl';

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

  public addToQueue(source: string) {
    this.queue.push(source);
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  private async playTrack(source: string) {
    try {
      let resource: AudioResource;

      if (existsSync(source)) {
        // ローカルファイルの場合
        const stream = createReadStream(source);
        resource = createAudioResource(stream);
      } else {
        // URLの場合
        const stream = await play.stream(source);
        resource = createAudioResource(stream.stream, {
          inputType: stream.type
        });
      }
      
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

  public async playNext() {
    if (this.queue.length === 0) return;

    const source = this.queue.shift();
    if (!source) return;

    this.currentTrack = source;
    await this.playTrack(source);
  }

  private async playAgain() {
    if (!this.currentTrack) return;
    await this.playTrack(this.currentTrack);
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
