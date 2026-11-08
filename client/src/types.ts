export interface EpisodeItem {
  id: string;
  title: string;
  fileName: string;
  size: number;
  formattedSize: string;
  episodeNumber: number;
  fileIndex?: number;
  streamUrl?: string;
}

export interface PlaybackProgress {
  videoId: string;
  title: string;
  currentTime: number;
  duration: number;
  percentage: number;
  updatedAt: number;
  poster?: string;
  category?: string;
  magnetLink?: string;
  streamUrl?: string;
  currentEpisodeId?: string;
  currentEpisodeTitle?: string;
}

export interface VideoItem {
  id: string;
  title: string;
  year: number | string;
  duration: string;
  genre?: string;
  rating: string;
  description: string;
  poster: string;
  backdrop: string;
  magnetLink: string;
  source?: 'curated' | 'archive' | 'p2p';
  streamUrl?: string; // If provided, streams directly via HTTP Range proxy
  seeders?: number;
  leechers?: number;
  size?: number;
  downloads?: number;
  category?: string;
  identifier?: string;
  rawTitle?: string;
  episodes?: EpisodeItem[];
}

export interface TorrentStats {
  status: 'not_found' | 'connecting' | 'loading_metadata' | 'ready';
  name?: string;
  fileName?: string;
  fileSize?: number;
  numPeers: number;
  downloadSpeed: number;
  uploadSpeed: number;
  progress: number;
  downloaded: number;
  totalLength: number;
  timeRemaining?: number;
}
