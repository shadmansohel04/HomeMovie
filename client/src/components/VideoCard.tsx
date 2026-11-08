import React from 'react';
import { Play, Copy, Check, Users } from 'lucide-react';
import type { VideoItem } from '../types';

interface VideoCardProps {
  video: VideoItem;
  onPlay: (video: VideoItem) => void;
  isSelected?: boolean;
}

export const VideoCard: React.FC<VideoCardProps> = ({ video, onPlay, isSelected }) => {
  const [copied, setCopied] = React.useState(false);
  const [imgError, setImgError] = React.useState(false);

  const handleCopyMagnet = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(video.magnetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isP2P = video.source === 'p2p';

  return (
    <div
      onClick={() => onPlay(video)}
      className={`group relative flex flex-col rounded-xl overflow-hidden bg-neutral-900 border transition-all duration-300 cursor-pointer ${
        isSelected
          ? 'border-red-500 shadow-lg shadow-red-900/30 ring-2 ring-red-500/50'
          : 'border-neutral-800/80 hover:border-neutral-700 hover:shadow-xl hover:shadow-black/50 hover:-translate-y-1'
      }`}
    >
      {/* Poster Image Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-neutral-950 flex items-center justify-center">
        {imgError || !video.poster ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-neutral-900 to-neutral-950 p-4 text-center">
            <span className="text-xs font-semibold text-neutral-400 line-clamp-2">
              {video.title}
            </span>
          </div>
        ) : (
          <img
            src={video.poster}
            alt={video.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 via-transparent to-transparent opacity-85" />

        {/* Hover Play Button Overlay */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/50 transform group-hover:scale-110 transition-transform">
            <Play className="w-6 h-6 fill-white ml-0.5" />
          </div>
        </div>

        {/* Badges */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 flex-wrap">
          {isP2P && video.seeders !== undefined && (
            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-950/80 backdrop-blur-sm text-blue-400 border border-blue-800/60">
              <Users className="w-2.5 h-2.5" /> {video.seeders} Seeds
            </span>
          )}
          {video.year && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-neutral-300">
              {video.year}
            </span>
          )}
        </div>

        {/* Duration / Size Badge */}
        {video.duration && (
          <span className="absolute bottom-2 right-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-black/80 backdrop-blur-sm text-neutral-300">
            {video.duration}
          </span>
        )}
      </div>

      {/* Card Info */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-bold text-white text-sm group-hover:text-red-400 transition-colors line-clamp-2" title={video.title}>
              {video.title}
            </h3>
            {video.magnetLink && (
              <button
                onClick={handleCopyMagnet}
                className="text-neutral-500 hover:text-neutral-300 p-1 rounded hover:bg-neutral-800 transition flex-shrink-0"
                title="Copy link"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          <p className="text-xs text-neutral-400 line-clamp-2 mb-3 leading-relaxed">
            {video.description}
          </p>
        </div>

        <div className="pt-2 border-t border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400">
          <span className="truncate max-w-[170px] text-neutral-400 font-medium">
            {video.category || video.genre || 'Media'}
          </span>
          <span className="text-red-400 font-bold group-hover:translate-x-0.5 transition-transform">
            Watch Now →
          </span>
        </div>
      </div>
    </div>
  );
};
