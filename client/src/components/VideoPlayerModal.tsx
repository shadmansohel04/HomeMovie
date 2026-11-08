import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  X,
  Radio,
  Users,
  Download,
  Upload,
  HardDrive,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  Globe,
  ArrowLeft,
  Share2,
  Tv,
  Cast,
  Home,
  Maximize,
  Minimize,
} from 'lucide-react';
import type { VideoItem, TorrentStats } from '../types';
import { formatBytes, formatSpeed } from '../utils/format';
import { saveVideoProgress, getVideoProgress } from '../utils/storage';
import { getApiUrl } from '../config';
import { CastModal } from './CastModal';

interface VideoPlayerModalProps {
  video: VideoItem;
  onClose: () => void;
  onGoHome?: () => void;
  onSelectVideo?: (v: VideoItem) => void;
  allVideos?: VideoItem[];
  autoFullscreen?: boolean;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({
  video,
  onClose,
  onGoHome,
  onSelectVideo,
  allVideos = [],
  autoFullscreen = false,
}) => {
  const [stats, setStats] = useState<TorrentStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const [isCastOpen, setIsCastOpen] = useState(false);
  const [hasResumed, setHasResumed] = useState(false);
  const [resumePrompt, setResumePrompt] = useState<{ time: number } | null>(null);
  const [showFullscreenOverlay, setShowFullscreenOverlay] = useState(false);
  const [key, setKey] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  // Try direct video fullscreen and fallback to full-window immersion
  useEffect(() => {
    if (!autoFullscreen) return;

    const el = videoRef.current;
    if (el) {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {
          // If browser security policy blocks programmatic requestFullscreen,
          // show a 1-click tap banner to fulfill user gesture requirement
          setShowFullscreenOverlay(true);
        });
      } else if ((el as any).webkitRequestFullscreen) {
        try { (el as any).webkitRequestFullscreen(); } catch { setShowFullscreenOverlay(true); }
      } else {
        setShowFullscreenOverlay(true);
      }
    }
  }, [autoFullscreen]);

  const isDirectArchive = !!video.streamUrl;
  const streamUrl = video.streamUrl
    ? getApiUrl(video.streamUrl)
    : getApiUrl(`/api/stream?magnet=${encodeURIComponent(video.magnetLink)}`);

  // Check saved progress on load
  useEffect(() => {
    const saved = getVideoProgress(video.id);
    if (saved && saved.currentTime > 5 && saved.duration > 0) {
      setResumePrompt({ time: saved.currentTime });
    }
  }, [video.id]);

  // Periodic progress saving & unload sync
  useEffect(() => {
    // Record initial view immediately on mount
    saveVideoProgress({
      videoId: video.id,
      title: video.title,
      currentTime: 0,
      duration: 60,
      poster: video.poster,
      category: video.category,
      magnetLink: video.magnetLink,
      streamUrl: video.streamUrl,
    });

    const saveCurrent = () => {
      const el = videoRef.current;
      if (!el) return;

      saveVideoProgress({
        videoId: video.id,
        title: video.title,
        currentTime: el.currentTime || 0,
        duration: el.duration || 60,
        poster: video.poster,
        category: video.category,
        magnetLink: video.magnetLink,
        streamUrl: video.streamUrl,
      });
    };

    const interval = setInterval(saveCurrent, 2000);
    window.addEventListener('beforeunload', saveCurrent);

    return () => {
      saveCurrent();
      clearInterval(interval);
      window.removeEventListener('beforeunload', saveCurrent);
    };
  }, [video]);

  // Poll real-time P2P stats if using WebTorrent
  useEffect(() => {
    if (isDirectArchive || !video.magnetLink) return;
    let isMounted = true;

    const fetchStats = async () => {
      try {
        const res = await fetch(getApiUrl(`/api/stats?magnet=${encodeURIComponent(video.magnetLink)}`));
        if (res.ok) {
          const data: TorrentStats = await res.json();
          if (isMounted) setStats(data);
        }
      } catch (err) {
        // Silently catch stats polling errors
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 1000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [video.magnetLink, isDirectArchive]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopyMagnet = () => {
    if (!video.magnetLink) return;
    navigator.clipboard.writeText(video.magnetLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyShareUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleReload = () => {
    setPlayerError(null);
    setKey((prev) => prev + 1);
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto bg-black flex flex-col justify-start items-center transition-all ${
        autoFullscreen ? 'p-0' : 'p-3 sm:p-6 backdrop-blur-2xl bg-black/95'
      }`}
    >
      <div className={`w-full my-auto ${autoFullscreen ? 'max-w-none h-screen flex flex-col' : 'max-w-5xl'}`}>
        {/* Navigation & Title Header Bar */}
        <div className={`flex items-center justify-between gap-4 px-3 py-2 ${autoFullscreen ? 'bg-neutral-950/80 backdrop-blur-md border-b border-neutral-800' : 'mb-3 px-1'}`}>
          <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
            {onGoHome && (
              <button
                onClick={onGoHome}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-sm shadow-red-600/30 cursor-pointer"
                title="Return to Home Screen"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 text-xs font-semibold transition cursor-pointer"
              title="Back to Catalog"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>

            {isDirectArchive ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                <Globe className="w-3 h-3 text-emerald-400" />
                Direct Stream
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-950/80 border border-red-800/80 text-red-400 text-xs font-bold uppercase tracking-wider">
                <Radio className="w-3 h-3 animate-pulse text-red-500" />
                Live Swarm
              </span>
            )}

            <h2 className="text-base sm:text-lg font-bold text-white truncate" title={video.title}>
              {video.title}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsCastOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-md shadow-red-600/30 cursor-pointer"
              title="Cast to TV Screen"
            >
              <Cast className="w-3.5 h-3.5" />
              <span>Cast to TV</span>
            </button>

            <button
              onClick={handleCopyShareUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 text-xs font-medium transition cursor-pointer"
              title="Share Page URL"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">URL Copied</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition cursor-pointer"
              title="Close Player (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Player Container */}
        <div className={`relative overflow-hidden bg-black ${autoFullscreen ? 'flex-1 w-full h-full rounded-none' : 'rounded-2xl border border-neutral-800 shadow-2xl'}`}>
          {/* HTML5 Native Video Player */}
          <div className={`relative w-full bg-black flex items-center justify-center ${autoFullscreen ? 'h-full' : 'aspect-video'}`}>
            <video
              key={`${video.id}-${key}`}
              ref={videoRef}
              src={streamUrl}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
              onLoadedMetadata={() => {
                if (!hasResumed && resumePrompt?.time && videoRef.current) {
                  videoRef.current.currentTime = resumePrompt.time;
                  setHasResumed(true);
                }
              }}
              onError={() => {
                setPlayerError(
                  isDirectArchive
                    ? 'Loading media stream from server... If buffering takes a while, click Retry.'
                    : 'WebTorrent engine is finding peers. If the swarm has low seeders, connection may take a few moments.'
                );
              }}
              onPlaying={() => {
                setPlayerError(null);

                // If in autoFullscreen TV mode, ensure HTML5 video element is fullscreen
                if (autoFullscreen && videoRef.current && document.fullscreenElement !== videoRef.current) {
                  const el = videoRef.current;
                  if (el.requestFullscreen) {
                    el.requestFullscreen().catch(() => {});
                  } else if ((el as any).webkitRequestFullscreen) {
                    (el as any).webkitRequestFullscreen();
                  }
                }

                // Immediately record video in recently watched upon playback start
                const el = videoRef.current;
                saveVideoProgress({
                  videoId: video.id,
                  title: video.title,
                  currentTime: el ? el.currentTime : 0,
                  duration: el && el.duration ? el.duration : 60,
                  poster: video.poster,
                  category: video.category,
                  magnetLink: video.magnetLink,
                  streamUrl: video.streamUrl,
                });
              }}
            />

            {/* Resume playback toast notification */}
            {resumePrompt && (
              <div className="absolute top-4 left-4 z-30 bg-neutral-900/90 border border-neutral-700/80 backdrop-blur-md px-3.5 py-2 rounded-xl flex items-center gap-3 text-xs shadow-xl animate-in fade-in duration-300">
                <span className="text-white">
                  Resumed from <strong>{Math.floor(resumePrompt.time / 60)}m {Math.floor(resumePrompt.time % 60)}s</strong>
                </span>
                <button
                  onClick={() => {
                    if (videoRef.current) videoRef.current.currentTime = 0;
                    setResumePrompt(null);
                  }}
                  className="text-red-400 hover:text-red-300 font-bold underline cursor-pointer"
                >
                  Start Over
                </button>
                <button
                  onClick={() => setResumePrompt(null)}
                  className="text-neutral-500 hover:text-white p-0.5 rounded cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* 1-Click Tap Overlay for TV screen if browser prevents programmatic fullscreen */}
            {showFullscreenOverlay && (
              <div
                onClick={() => {
                  const el = videoRef.current;
                  if (el) {
                    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
                    else if ((el as any).webkitRequestFullscreen) (el as any).webkitRequestFullscreen();
                  }
                  setShowFullscreenOverlay(false);
                }}
                className="absolute inset-0 z-40 bg-black/60 flex flex-col items-center justify-center cursor-pointer backdrop-blur-sm group transition"
              >
                <div className="flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-red-600 group-hover:bg-red-500 text-white font-bold text-base shadow-2xl shadow-red-600/50 transform group-hover:scale-105 transition-all">
                  <Maximize className="w-5 h-5" />
                  <span>Click anywhere to Fullscreen Video</span>
                </div>
              </div>
            )}

            {/* Error / Loading Overlay */}
            {playerError && (
              <div className="absolute inset-0 bg-neutral-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center z-20">
                <AlertCircle className="w-12 h-12 text-amber-500 mb-3 animate-bounce" />
                <h4 className="text-lg font-bold text-white mb-2">Connecting to Media Stream</h4>
                <p className="text-sm text-neutral-400 max-w-md mb-4 leading-relaxed">
                  {playerError}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleReload}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-sm transition shadow-lg shadow-red-600/30 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry Stream
                  </button>
                  {video.magnetLink && (
                    <button
                      onClick={handleCopyMagnet}
                      className="px-4 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium text-sm transition cursor-pointer"
                    >
                      {copied ? 'Copied Magnet' : 'Copy Magnet Link'}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Real-Time Metrics HUD */}
          <div className="bg-neutral-950/95 border-t border-neutral-800/90 p-4 sm:p-5">
            <div className="flex flex-col gap-3">
              {/* If WebTorrent: show live peer swarm HUD */}
              {!isDirectArchive ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Active Peers */}
                  <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[11px] uppercase font-semibold text-neutral-400 tracking-wider">
                        Active Peers
                      </div>
                      <div className="text-lg font-extrabold text-white flex items-center gap-1.5">
                        {stats ? stats.numPeers : video.seeders || 0}
                        <span className="text-[10px] text-neutral-400 font-normal">nodes</span>
                      </div>
                    </div>
                  </div>

                  {/* Download Speed */}
                  <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[11px] uppercase font-semibold text-neutral-400 tracking-wider">
                        Download Speed
                      </div>
                      <div className="text-lg font-extrabold text-emerald-400">
                        {stats ? formatSpeed(stats.downloadSpeed) : '0 KB/s'}
                      </div>
                    </div>
                  </div>

                  {/* Upload Speed */}
                  <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-[11px] uppercase font-semibold text-neutral-400 tracking-wider">
                        Upload Speed
                      </div>
                      <div className="text-lg font-extrabold text-blue-400">
                        {stats ? formatSpeed(stats.uploadSpeed) : '0 KB/s'}
                      </div>
                    </div>
                  </div>

                  {/* Buffer & File Size */}
                  <div className="bg-neutral-900/80 border border-neutral-800 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                      <HardDrive className="w-5 h-5" />
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-[11px] uppercase font-semibold text-neutral-400 tracking-wider">
                        Downloaded / Total
                      </div>
                      <div className="text-base font-extrabold text-white truncate">
                        {stats ? formatBytes(stats.downloaded) : '0 B'} /{' '}
                        {stats && stats.fileSize
                          ? formatBytes(stats.fileSize)
                          : video.size
                          ? formatBytes(video.size)
                          : '—'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Archive stream banner */
                <div className="bg-neutral-900/60 border border-neutral-800 rounded-xl p-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">
                        Internet Archive Cloud Proxy Active
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        Streaming on-demand with HTTP 206 Partial Content byte-range scrubbing.
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-950/70 text-emerald-400 border border-emerald-800/60">
                    High Speed CDN
                  </span>
                </div>
              )}

              {/* Progress bar */}
              {stats && !isDirectArchive && (
                <div className="w-full bg-neutral-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-red-600 to-red-400 h-full transition-all duration-500 ease-out"
                    style={{ width: `${Math.max(2, (stats.progress || 0) * 100)}%` }}
                  />
                </div>
              )}

              {/* Video Info and Controls Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-neutral-400">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-neutral-200">
                    {video.category || video.genre || 'Media'}
                  </span>
                  <span>•</span>
                  <span>{video.year}</span>
                  <span>•</span>
                  <span>{video.duration}</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-medium">{video.rating}</span>
                </div>

                <div className="flex items-center gap-2">
                  {video.magnetLink && (
                    <button
                      onClick={handleCopyMagnet}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition cursor-pointer"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-neutral-400" />
                          <span>Copy Magnet URI</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-neutral-400 leading-relaxed pt-1 border-t border-neutral-900">
                {video.description}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Switch to Other Videos */}
        {allVideos.length > 1 && onSelectVideo && (
          <div className="mt-4 px-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 mb-2">
              More In This Selection
            </h4>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
              {allVideos
                .filter((v) => v.id !== video.id)
                .slice(0, 10)
                .map((v) => (
                  <button
                    key={v.id}
                    onClick={() => onSelectVideo(v)}
                    className="flex-shrink-0 flex items-center gap-2.5 p-2 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800/80 hover:border-neutral-700 transition text-left cursor-pointer"
                  >
                    <img
                      src={v.poster}
                      alt={v.title}
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <div>
                      <div className="text-xs font-bold text-white truncate max-w-[140px]">
                        {v.title}
                      </div>
                      <div className="text-[10px] text-neutral-400">{v.duration}</div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}

        {/* Cast to TV Modal */}
        <CastModal
          isOpen={isCastOpen}
          onClose={() => setIsCastOpen(false)}
          video={video}
          currentTime={videoRef.current ? Math.floor(videoRef.current.currentTime) : 0}
        />
      </div>
    </div>
  );
};
