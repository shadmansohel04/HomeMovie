import React, { useState } from 'react';
import { Cast, X, Check, AlertCircle, Tv, Loader2 } from 'lucide-react';
import { getWsUrl } from '../config';
import type { VideoItem } from '../types';

interface CastModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: VideoItem;
  currentEpisode?: any;
  currentTime?: number;
}

export const CastModal: React.FC<CastModalProps> = ({
  isOpen,
  onClose,
  video,
  currentEpisode,
  currentTime = 0,
}) => {
  const [code, setCode] = useState(() => localStorage.getItem('p2pflix_last_paired_tv') || '');
  const [status, setStatus] = useState<'idle' | 'pairing' | 'casting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleCast = () => {
    const cleanCode = code.trim();
    if (!cleanCode) {
      setErrorMessage('Please enter the 6-digit TV code.');
      setStatus('error');
      return;
    }

    setStatus('pairing');
    setErrorMessage('');

    const wsUrl = getWsUrl('/ws/remote');
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      // Step 1: Pair remote with the TV code
      socket.send(
        JSON.stringify({
          action: 'PAIR_REMOTE',
          code: cleanCode,
        })
      );
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.event === 'PAIR_SUCCESS') {
          setStatus('casting');
          localStorage.setItem('p2pflix_last_paired_tv', cleanCode);

          // Step 2: Trigger fullscreen playback on the TV screen!
          socket.send(
            JSON.stringify({
              action: 'CAST_VIDEO',
              code: cleanCode,
              video,
              episode: currentEpisode,
              startTime: currentTime,
            })
          );
        }

        if (data.event === 'CAST_SUCCESS') {
          setStatus('success');
          setTimeout(() => {
            socket.close();
            onClose();
          }, 1500);
        }

        if (data.event === 'PAIR_FAILED' || data.event === 'CAST_FAILED') {
          setStatus('error');
          setErrorMessage(data.message || 'Could not connect to TV.');
          socket.close();
        }
      } catch (err) {
        setStatus('error');
        setErrorMessage('Communication error with server.');
      }
    };

    socket.onerror = () => {
      setStatus('error');
      setErrorMessage('Failed to connect to remote server.');
    };
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center">
              <Cast className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Play on TV Screen</h3>
              <p className="text-xs text-neutral-400">Stream this video to another machine</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Target Video Info */}
          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center gap-3">
            <img
              src={video.poster || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80'}
              alt={video.title}
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
            />
            <div className="overflow-hidden">
              <div className="text-xs font-bold text-white truncate">
                {currentEpisode ? `${video.title} • ${currentEpisode.title}` : video.title}
              </div>
              <div className="text-[11px] text-neutral-400">
                Will open in Fullscreen on target TV
              </div>
            </div>
          </div>

          {/* TV Pairing Code Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Enter TV Code (from the other screen)
            </label>
            <input
              type="text"
              maxLength={6}
              placeholder="e.g. 732130"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, ''));
                if (status === 'error') setStatus('idle');
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleCast()}
              className="w-full bg-neutral-950 font-mono text-center text-2xl font-bold tracking-widest text-white px-4 py-2.5 rounded-xl border border-neutral-800 focus:outline-none focus:border-red-500 transition shadow-inner"
            />
          </div>

          {/* Error Message */}
          {status === 'error' && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/40 border border-red-900/60 p-2.5 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Message */}
          {status === 'success' && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 p-2.5 rounded-lg">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>Playing in fullscreen on TV screen!</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleCast}
              disabled={status === 'pairing' || status === 'casting' || !code.trim()}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition shadow-md shadow-red-600/30 disabled:opacity-50 cursor-pointer"
            >
              {status === 'pairing' || status === 'casting' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : status === 'success' ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Casting!</span>
                </>
              ) : (
                <>
                  <Tv className="w-4 h-4" />
                  <span>Play on TV</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
