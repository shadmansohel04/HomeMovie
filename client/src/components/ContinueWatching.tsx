import React from 'react';
import { Play, RotateCcw, X, Clock } from 'lucide-react';
import type { PlaybackProgress, VideoItem } from '../types';
import { formatTime } from '../utils/storage';

interface ContinueWatchingProps {
  items: PlaybackProgress[];
  onPlayItem: (video: VideoItem) => void;
  onRemoveItem: (videoId: string) => void;
}

export const ContinueWatching: React.FC<ContinueWatchingProps> = ({
  items,
  onPlayItem,
  onRemoveItem,
}) => {
  if (!items || items.length === 0) return null;

  return (
    <section className="mb-10 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <RotateCcw className="w-5 h-5 text-red-500" />
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Continue Watching
          </h2>
        </div>
        <span className="text-xs text-neutral-400">
          Resume where you stopped
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.slice(0, 4).map((item) => {
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
                    onRemoveItem(item.videoId);
                  }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/70 hover:bg-black text-neutral-400 hover:text-white transition cursor-pointer"
                  title="Remove from history"
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
                  <span className="text-neutral-400">{item.percentage}% complete</span>
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
  );
};
