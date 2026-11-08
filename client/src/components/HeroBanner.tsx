import React from 'react';
import { Play, Share2, Sparkles, Check } from 'lucide-react';
import type { VideoItem } from '../types';

interface HeroBannerProps {
  video: VideoItem;
  onPlay: (video: VideoItem) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ video, onPlay }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(video.magnetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden bg-neutral-900 border border-neutral-800/90 shadow-2xl mb-8 group">
      {/* Background Poster / Backdrop Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={video.backdrop || video.poster}
          alt={video.title}
          className="w-full h-full object-cover object-center brightness-40 contrast-125 filter group-hover:scale-105 transition-transform duration-1000 ease-out"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-neutral-950 via-neutral-950/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 p-6 sm:p-10 md:p-12 max-w-3xl flex flex-col justify-end min-h-[360px] sm:min-h-[420px]">
        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="flex items-center gap-1 bg-red-600/90 text-white text-xs font-bold px-2.5 py-0.5 rounded shadow">
            <Sparkles className="w-3 h-3" /> FEATURED STREAM
          </span>
          <span className="bg-neutral-800/80 text-neutral-300 text-xs font-medium px-2 py-0.5 rounded border border-neutral-700/60">
            {video.year}
          </span>
          <span className="bg-neutral-800/80 text-neutral-300 text-xs font-medium px-2 py-0.5 rounded border border-neutral-700/60">
            {video.duration}
          </span>
          <span className="bg-emerald-950/80 text-emerald-300 text-xs font-medium px-2 py-0.5 rounded border border-emerald-800/60">
            {video.rating}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3 drop-shadow-md">
          {video.title}
        </h1>

        {/* Synopsis */}
        <p className="text-sm sm:text-base text-neutral-300 line-clamp-3 mb-6 max-w-2xl leading-relaxed">
          {video.description}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => onPlay(video)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-sm tracking-wide shadow-lg shadow-red-600/40 hover:shadow-red-600/60 transition-all transform active:scale-95 cursor-pointer"
          >
            <Play className="w-5 h-5 fill-white" />
            Watch via WebTorrent P2P
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-200 text-sm font-semibold border border-neutral-700/80 transition-all cursor-pointer"
            title="Copy Magnet Link"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Magnet Copied</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4 text-neutral-400" />
                <span>Copy Magnet</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
