
import Dexie from 'dexie';
import type { Table } from 'dexie';
import { Playlist, Video, VideoProgress, VideoNotes } from './types';

/**
 * YouTube Tracker Database
 * Extends Dexie to provide indexedDB storage for playlists, videos, progress tracking, and AI-generated notes.
 */
// Fix: Use default import for Dexie instead of named import. This ensures the 
// class correctly inherits standard methods like version() and transaction() 
// in all environments, resolving reported type errors where these methods were missing.
export class PlaylistDatabase extends Dexie {
  playlists!: Table<Playlist>;
  videos!: Table<Video & { playlistId: string }>;
  progress!: Table<VideoProgress>;
  notes!: Table<VideoNotes>;

  constructor() {
    super('YouTubeTrackerDB');
    // Fix: Inherit the version() method from the Dexie base class by 
    // ensuring Dexie is imported as the default class export.
    this.version(3).stores({
      playlists: 'id, lastAccessed',
      videos: '[id+playlistId], playlistId',
      progress: '[videoId+playlistId], playlistId',
      notes: '[videoId+playlistId], videoId, playlistId, createdAt'
    });
  }
}

export const db: PlaylistDatabase = new PlaylistDatabase();
