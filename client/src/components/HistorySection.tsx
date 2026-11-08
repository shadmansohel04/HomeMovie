import React from 'react';
import { Play, RotateCcw, X, Clock, CheckCircle, Trash2 } from 'lucide-react';
import type { PlaybackProgress, VideoItem } from '../types';
import { formatTime, clearAllWatchHistory } from '../utils/storage';

interface HistorySectionProps {
  continueWatching: PlaybackProgress[];
  recentlyWatched: PlaybackProgress[];
  onPlayItem: (video: VideoItem) => void;
  onRemoveContinueWatching: (videoId: string) => void;
  onRemoveRecent: (videoId: string) => void;
  onClearAll?: () => void;
}

export const HistorySection: React.FC<HistorySectionProps> = ({
  continueWatching,
  recentlyWatched,
  onPlayItem,
  onRemoveContinueWatching,
  onRemoveRecent,
  onClearAll,
}) => {
  const hasContinue = continueWatching.length > 0;
  const hasRecent = recentlyWatched.length > 0;

  if (!hasContinue && !hasRecent) {
    return (
      <div className="py-28 flex flex-col items-center justify-center text-center max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center text-neutral-500 mb-4 shadow-inner">
          <Clock className="w-8 h-8 text-neutral-600" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">No Watch History Yet</h3>
        <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
          Search for any movie or TV show using the search bar above to start streaming. Your unfinished and recently watched media will automatically appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Global History Action Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-850">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Your Media Hub</h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Local browser storage &bull; {continueWatching.length} in progress, {recentlyWatched.length} watched
          </p>
        </div>
        {onClearAll && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900/80 hover:bg-red-950/40 text-neutral-400 hover:text-red-400 border border-neutral-800 hover:border-red-800/60 text-xs font-semibold transition cursor-pointer"
            title="Clear all watch history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        )}
      </div>

      {/* 1. Continue Watching (Unfinished) */}
      {hasContinue && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-red-500" />
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Continue Watching
              </h2>
            </div>
            <span className="text-xs text-neutral-400">
              Pick up where you stopped
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {continueWatching.map((item) => {
              const video: VideoItem = {
                id: item.videoId,
                title: item.title,
                year: 'Resume',
                duration: formatTime(item.duration),
                rating: `${item.percentage}% Watched`,
                description: `Resume playback from ${formatTime(item.currentTime)}.`,
                poster: item.poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80',
                backdrop: item.poster || '',
                magnetLink: item.magnetLink || '',
                streamUrl: item.streamUrl,
                category: item.category || 'Resume Watching',
              };

              return (
                <div
                  key={item.videoId}
                  onClick={() => onPlayItem(video)}
                  className="group relative flex flex-col rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-red-500/80 transition-all shadow-lg hover:shadow-red-950/20 cursor-pointer"
                >
                  <div className="relative aspect-video w-full bg-neutral-950 overflow-hidden">
                    <img
                      src={item.poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80'}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent opacity-80" />

                    {/* Hover Play Button */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/50 transform group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 fill-white ml-0.5" />
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-neutral-800">
                      <div
                        className="bg-red-600 h-full"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>

                    {/* Remove button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveContinueWatching(item.videoId);
                      }}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/70 hover:bg-black text-neutral-400 hover:text-white transition cursor-pointer"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-3.5 flex flex-col justify-between flex-1">
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors line-clamp-1" title={item.title}>
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-neutral-400">
                        <Clock className="w-3.5 h-3.5 text-red-500" />
                        <span>{formatTime(item.currentTime)} / {formatTime(item.duration)}</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                      <span className="text-neutral-400">{item.percentage}% watched</span>
                      <span className="text-red-400 font-bold group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                        Resume <Play className="w-3 h-3 fill-red-400" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 2. Recently Watched */}
      {hasRecent && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-neutral-400" />
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Recently Watched
              </h2>
            </div>
            <span className="text-xs text-neutral-400">
              Your viewing history
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {recentlyWatched.map((item) => {
              const video: VideoItem = {
                id: item.videoId,
                title: item.title,
                year: 'Recent',
                duration: formatTime(item.duration),
                rating: 'Completed',
                description: `Recently played video.`,
                poster: item.poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80',
                backdrop: item.poster || '',
                magnetLink: item.magnetLink || '',
                streamUrl: item.streamUrl,
                category: item.category || 'Recently Watched',
              };

              return (
                <div
                  key={item.videoId}
                  onClick={() => onPlayItem(video)}
                  className="group relative flex flex-col rounded-xl overflow-hidden bg-neutral-900 border border-neutral-800 hover:border-neutral-700 transition-all shadow-md cursor-pointer"
                >
                  <div className="relative aspect-video w-full bg-neutral-950 overflow-hidden">
                    <img
                      src={item.poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80'}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-transparent to-transparent opacity-80" />

                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                        <Play className="w-6 h-6 fill-white ml-0.5" />
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveRecent(item.videoId);
                      }}
                      className="absolute top-2 right-2 p-1 rounded-full bg-black/70 hover:bg-black text-neutral-400 hover:text-white transition cursor-pointer"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="p-3.5 flex flex-col justify-between flex-1">
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-red-400 transition-colors line-clamp-1" title={item.title}>
                        {item.title}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-neutral-400">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Completed</span>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-neutral-800/80 flex items-center justify-between text-xs">
                      <span className="text-neutral-400">{formatTime(item.duration)}</span>
                      <span className="text-neutral-300 font-semibold group-hover:text-red-400 transition-colors flex items-center gap-1">
                        Play Again <Play className="w-3 h-3 fill-current" />
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};
