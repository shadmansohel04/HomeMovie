import React, { useEffect, useState, useRef } from 'react';
import { Tv, Copy, Check, Cast, Maximize, X, Volume2, Sparkles, AlertCircle, Home } from 'lucide-react';
import type { VideoItem } from '../types';

interface TVModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGoHome?: () => void;
  onPlayIncomingVideo: (video: VideoItem, episode?: any, startTime?: number) => void;
}

export const TVModeModal: React.FC<TVModeModalProps> = ({
  isOpen,
  onClose,
  onGoHome,
  onPlayIncomingVideo,
}) => {
  const [tvCode, setTvCode] = useState<string | null>(null);
  const [remoteCount, setRemoteCount] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [incomingAlert, setIncomingAlert] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!isOpen) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/remote`;
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      // Check if machine already has a stored TV code preference
      const savedCode = localStorage.getItem('p2pflix_tv_code');
      socket.send(
        JSON.stringify({
          action: 'REGISTER_TV',
          requestedCode: savedCode || undefined,
        })
      );
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.event === 'TV_REGISTERED') {
          setTvCode(data.code);
          localStorage.setItem('p2pflix_tv_code', data.code);
        }

        if (data.event === 'REMOTE_CONNECTED') {
          setRemoteCount(data.remoteCount || 1);
        }

        // INCOMING CAST EVENT: Play video and trigger fullscreen
        if (data.event === 'PLAY_ON_TV') {
          const video: VideoItem = data.video;
          setIncomingAlert(`Playing "${video.title}" from remote device...`);

          setTimeout(() => {
            setIncomingAlert(null);
            onPlayIncomingVideo(video, data.episode, data.startTime);

            // Attempt browser fullscreen request
            if (document.documentElement.requestFullscreen) {
              document.documentElement.requestFullscreen().catch(() => {});
            }
          }, 1200);
        }
      } catch (err) {
        console.error('TV socket message error:', err);
      }
    };

    socket.onclose = () => {
      console.log('TV socket closed');
    };

    return () => {
      socket.close();
      wsRef.current = null;
    };
  }, [isOpen, onPlayIncomingVideo]);

  if (!isOpen) return null;

  const handleCopyCode = () => {
    if (!tvCode) return;
    navigator.clipboard.writeText(tvCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-white select-none animate-in fade-in duration-300">
      {/* Top Controls */}
      <div className="absolute top-6 right-6 flex items-center gap-3">
        {onGoHome && (
          <button
            onClick={() => {
              onClose();
              onGoHome();
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-bold transition shadow-md shadow-red-600/30 cursor-pointer"
            title="Return to Home Screen"
          >
            <Home className="w-4 h-4" />
            <span>Home</span>
          </button>
        )}

        <button
          onClick={toggleFullscreen}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-sm font-semibold transition cursor-pointer"
        >
          <Maximize className="w-4 h-4" />
          <span>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</span>
        </button>

        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 transition cursor-pointer"
          title="Exit TV Mode"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main TV Screen Pairing View */}
      <div className="max-w-xl w-full text-center flex flex-col items-center">
        {/* TV Icon with Glow */}
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-red-600 to-red-400 flex items-center justify-center shadow-2xl shadow-red-600/50">
            <Tv className="w-12 h-12 text-white" />
          </div>
          <div className="absolute -inset-2 bg-red-600/20 blur-xl rounded-full -z-10 animate-pulse" />
        </div>

        <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-3">
          TV Mode Active
        </h1>
        <p className="text-sm sm:text-base text-neutral-400 mb-8 max-w-md">
          Open this app on your phone, laptop, or another device. Tap <strong>Cast to TV</strong> and enter this code:
        </p>

        {/* Big Code Card */}
        <div
          onClick={handleCopyCode}
          className="group relative flex items-center justify-center gap-4 px-10 py-6 rounded-2xl bg-neutral-900/90 border-2 border-red-500/80 shadow-2xl shadow-red-950/40 cursor-pointer hover:scale-105 transition-all"
        >
          <div className="font-mono text-5xl sm:text-6xl font-black tracking-widest text-white drop-shadow">
            {tvCode || '••••••'}
          </div>
          <div className="text-neutral-400 group-hover:text-white transition">
            {copied ? <Check className="w-6 h-6 text-emerald-400" /> : <Copy className="w-6 h-6" />}
          </div>
        </div>

        <div className="text-xs text-neutral-500 mt-3">
          Click code to copy &bull; Unique code for this machine
        </div>

        {/* Incoming Cast Notification Banner */}
        {incomingAlert && (
          <div className="mt-8 px-6 py-4 rounded-2xl bg-emerald-950/90 border border-emerald-500/80 text-emerald-200 flex items-center gap-3 animate-bounce shadow-2xl">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">{incomingAlert}</span>
          </div>
        )}

        {/* Connected Remotes Indicator */}
        <div className="mt-12 flex items-center gap-2 px-4 py-2 rounded-full bg-neutral-900 border border-neutral-800 text-xs text-neutral-400">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              remoteCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-600'
            }`}
          />
          <span>
            {remoteCount > 0
              ? `${remoteCount} remote device(s) connected`
              : 'Waiting for device to connect...'}
          </span>
        </div>
      </div>
    </div>
  );
};
