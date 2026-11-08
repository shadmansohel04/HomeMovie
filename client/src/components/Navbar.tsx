import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Loader2, Home, Tv } from 'lucide-react';

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (q?: string) => void;
  isSearchingLive: boolean;
  totalResults: number;
  onOpenTVMode?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  isSearchingLive,
  onOpenTVMode,
}) => {
  const navigate = useNavigate();

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onSearchSubmit(searchQuery);
    }
  };

  const handleClear = () => {
    onSearchChange('');
    navigate('/', { replace: false });
  };

  const handleGoHome = () => {
    onSearchChange('');
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-neutral-950/95 backdrop-blur-md border-b border-neutral-800/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left Brand (Home) */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Simple Clean Home Link */}
          <button
            onClick={handleGoHome}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-neutral-900 text-white font-black tracking-tight transition cursor-pointer group"
            title="Go to Home"
          >
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-md shadow-red-600/30 group-hover:scale-105 transition-transform">
              <Home className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">Home</span>
          </button>
        </div>

        {/* Global URL-Synced Search Bar */}
        <div className="flex-1 max-w-xl mx-2 sm:mx-6">
          <div className="relative flex items-center">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search movies, TV shows, episodes..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full bg-neutral-900/90 text-sm text-neutral-100 placeholder-neutral-500 pl-10 pr-24 py-2 rounded-xl border border-neutral-800 focus:outline-none focus:border-red-500/80 focus:ring-1 focus:ring-red-500/50 transition-all shadow-inner"
            />

            {/* Quick Actions inside Search Bar */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <button
                  onClick={handleClear}
                  className="text-neutral-400 hover:text-white p-1 rounded-md cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => onSearchSubmit(searchQuery)}
                disabled={isSearchingLive}
                className="flex items-center gap-1 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isSearchingLive ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <span>Search</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* TV Mode button in top right */}
        <div className="flex items-center gap-2">
          {onOpenTVMode && (
            <button
              onClick={onOpenTVMode}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-200 hover:text-white border border-neutral-800 hover:border-neutral-700 text-xs font-bold transition shadow-sm cursor-pointer group"
              title="Open TV Mode (Get Code for this screen)"
            >
              <div className="w-2 h-2 rounded-full bg-red-500 group-hover:animate-ping" />
              <Tv className="w-4 h-4 text-red-500" />
              <span className="hidden sm:inline">TV Mode</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
