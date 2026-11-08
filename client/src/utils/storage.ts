import type { PlaybackProgress } from '../types';

/**
 * Storage adapter interface to support seamless migration to remote databases (e.g. Postgres, MongoDB, Supabase, SQLite, REST)
 */
export interface IHistoryRepository {
  getProgress(videoId: string): Promise<PlaybackProgress | null>;
  getAllProgress(): Promise<Record<string, PlaybackProgress>>;
  saveProgress(item: PlaybackProgress): Promise<void>;
  removeProgress(videoId: string): Promise<void>;
  getRecentlyWatched(): Promise<PlaybackProgress[]>;
  recordRecentlyWatched(item: PlaybackProgress): Promise<void>;
  removeRecentWatched(videoId: string): Promise<void>;
  clearAllHistory(): Promise<void>;
}

const PROGRESS_KEY = 'p2pflix_continue_watching';
const RECENT_KEY = 'p2pflix_recently_watched';

/**
 * LocalStorage implementation of IHistoryRepository
 */
export class LocalStorageHistoryRepository implements IHistoryRepository {
  async getProgress(videoId: string): Promise<PlaybackProgress | null> {
    const all = await this.getAllProgress();
    return all[videoId] || null;
  }

  async getAllProgress(): Promise<Record<string, PlaybackProgress>> {
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch (err) {
      console.error('[LocalStorageHistoryRepository] getProgress error:', err);
      return {};
    }
  }

  async getRecentlyWatched(): Promise<PlaybackProgress[]> {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (!raw) return [];
      const list: PlaybackProgress[] = JSON.parse(raw);
      return Array.isArray(list) ? list.sort((a, b) => b.updatedAt - a.updatedAt) : [];
    } catch (err) {
      console.error('[LocalStorageHistoryRepository] getRecentlyWatched error:', err);
      return [];
    }
  }

  async recordRecentlyWatched(item: PlaybackProgress): Promise<void> {
    try {
      const list = (await this.getRecentlyWatched()).filter((x) => x.videoId !== item.videoId);
      list.unshift(item);
      localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 30)));
      window.dispatchEvent(new Event('p2pflix_history_changed'));
    } catch (err) {
      console.error('[LocalStorageHistoryRepository] recordRecentlyWatched error:', err);
    }
  }

  async saveProgress(item: PlaybackProgress): Promise<void> {
    try {
      const all = await this.getAllProgress();
      all[item.videoId] = item;
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
      window.dispatchEvent(new Event('p2pflix_history_changed'));
    } catch (err) {
      console.error('[LocalStorageHistoryRepository] saveProgress error:', err);
    }
  }

  async removeProgress(videoId: string): Promise<void> {
    try {
      const all = await this.getAllProgress();
      if (all[videoId]) {
        delete all[videoId];
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
        window.dispatchEvent(new Event('p2pflix_history_changed'));
      }
    } catch (err) {
      console.error('[LocalStorageHistoryRepository] removeProgress error:', err);
    }
  }

  async removeRecentWatched(videoId: string): Promise<void> {
    try {
      const list = (await this.getRecentlyWatched()).filter((x) => x.videoId !== videoId);
      localStorage.setItem(RECENT_KEY, JSON.stringify(list));
      window.dispatchEvent(new Event('p2pflix_history_changed'));
    } catch (err) {
      console.error('[LocalStorageHistoryRepository] removeRecentWatched error:', err);
    }
  }

  async clearAllHistory(): Promise<void> {
    localStorage.removeItem(PROGRESS_KEY);
    localStorage.removeItem(RECENT_KEY);
    window.dispatchEvent(new Event('p2pflix_history_changed'));
  }
}

/**
 * Global repository instance.
 * When a backend DB is ready, replace new LocalStorageHistoryRepository() with new RemoteDatabaseHistoryRepository()
 */
let currentRepo: IHistoryRepository = new LocalStorageHistoryRepository();

export function setHistoryRepository(repo: IHistoryRepository) {
  currentRepo = repo;
}

export function getHistoryRepository(): IHistoryRepository {
  return currentRepo;
}

// Synchronous cached helpers for instant UI rendering with background repository sync
export function getSavedProgress(): Record<string, PlaybackProgress> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getVideoProgress(videoId: string): PlaybackProgress | null {
  const all = getSavedProgress();
  return all[videoId] || null;
}

export function getRecentlyWatched(): PlaybackProgress[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const list: PlaybackProgress[] = JSON.parse(raw);
    return Array.isArray(list) ? list.sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

export function getContinueWatchingList(): PlaybackProgress[] {
  const all = getSavedProgress();
  return Object.values(all).sort((a, b) => b.updatedAt - a.updatedAt);
}

/**
 * Saves video playback progress and syncs both Continue Watching & Previous Watch History
 */
export function saveVideoProgress(progress: {
  videoId: string;
  title: string;
  currentTime: number;
  duration: number;
  poster?: string;
  category?: string;
  magnetLink?: string;
  streamUrl?: string;
  currentEpisodeId?: string;
  currentEpisodeTitle?: string;
}) {
  if (!progress.videoId || !progress.duration || isNaN(progress.currentTime)) return;

  const percentage = Math.min(100, Math.round((progress.currentTime / progress.duration) * 100));

  const itemRecord: PlaybackProgress = {
    videoId: progress.videoId,
    title: progress.title,
    currentTime: Math.floor(progress.currentTime),
    duration: Math.floor(progress.duration),
    percentage,
    updatedAt: Date.now(),
    poster: progress.poster,
    category: progress.category,
    magnetLink: progress.magnetLink,
    streamUrl: progress.streamUrl,
    currentEpisodeId: progress.currentEpisodeId,
    currentEpisodeTitle: progress.currentEpisodeTitle,
  };

  // Record in Recently Watched immediately when started
  currentRepo.recordRecentlyWatched(itemRecord);

  // If user completed >= 92% or is within 90 seconds of the end, it counts as finished (credits)
  if (percentage >= 92 || progress.duration - progress.currentTime < 90) {
    currentRepo.removeProgress(progress.videoId);
    return;
  }

  // Add to Continue Watching if played for at least 1 second
  if (progress.currentTime >= 1) {
    currentRepo.saveProgress(itemRecord);
  }
}

export function removeVideoProgress(videoId: string) {
  currentRepo.removeProgress(videoId);
}

export function removeRecentWatched(videoId: string) {
  currentRepo.removeRecentWatched(videoId);
}

export function clearAllWatchHistory() {
  currentRepo.clearAllHistory();
}

/**
 * Format helper for seconds to mm:ss or hh:mm:ss
 */
export function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '0:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
