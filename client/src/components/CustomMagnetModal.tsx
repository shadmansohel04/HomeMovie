import React, { useState } from 'react';
import { X, Play, Link as LinkIcon, AlertCircle } from 'lucide-react';
import type { VideoItem } from '../types';

interface CustomMagnetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStreamMagnet: (customVideo: VideoItem) => void;
}

export const CustomMagnetModal: React.FC<CustomMagnetModalProps> = ({
  isOpen,
  onClose,
  onStreamMagnet,
}) => {
  const [magnet, setMagnet] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMagnet = magnet.trim();

    if (!cleanMagnet) {
      setError('Please provide a valid magnet URI');
      return;
    }

    if (!cleanMagnet.startsWith('magnet:?')) {
      setError('Invalid magnet link: must start with "magnet:?"');
      return;
    }

    // Attempt to extract title from dn= if title is not specified
    let detectedTitle = title.trim();
    if (!detectedTitle) {
      const match = cleanMagnet.match(/dn=([^&]+)/);
      if (match && match[1]) {
        detectedTitle = decodeURIComponent(match[1].replace(/\+/g, ' '));
      } else {
        detectedTitle = 'Custom WebTorrent Video';
      }
    }

    const customVideo: VideoItem = {
      id: `custom-${Date.now()}`,
      title: detectedTitle,
      year: new Date().getFullYear(),
      duration: 'Live P2P Stream',
      genre: 'Custom WebTorrent',
      rating: 'P2P Stream',
      description: 'Streamed directly over the decentralized BitTorrent/WebTorrent network.',
      poster: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600&auto=format&fit=crop&q=80',
      backdrop: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1400&auto=format&fit=crop&q=80',
      magnetLink: cleanMagnet,
    };

    onStreamMagnet(customVideo);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 text-red-500 flex items-center justify-center">
              <LinkIcon className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-white">Stream Custom Magnet Link</h3>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Video Title (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. My Open Source Clip"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-neutral-950 text-sm text-neutral-100 placeholder-neutral-600 px-3 py-2 rounded-lg border border-neutral-800 focus:outline-none focus:border-red-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
              Magnet URI <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="magnet:?xt=urn:btih:..."
              value={magnet}
              onChange={(e) => {
                setMagnet(e.target.value);
                if (error) setError('');
              }}
              className="w-full bg-neutral-950 text-xs font-mono text-neutral-100 placeholder-neutral-600 p-3 rounded-lg border border-neutral-800 focus:outline-none focus:border-red-500 transition resize-none"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-400 bg-red-950/40 border border-red-900/60 p-2.5 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white transition shadow-md shadow-red-600/30"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              Stream via WebTorrent
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
