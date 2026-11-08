import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { VideoCard } from './components/VideoCard';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { HistorySection } from './components/HistorySection';
import { TVModeModal } from './components/TVModeModal';
import { PasswordGate } from './components/PasswordGate';
import type { VideoItem, PlaybackProgress } from './types';
import {
  Film,
  Search,
  RefreshCw,
  AlertTriangle,
  Globe,
  Users,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  getContinueWatchingList,
  getRecentlyWatched,
  removeVideoProgress,
  removeRecentWatched,
  clearAllWatchHistory,
} from './utils/storage';

export const App: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // URL state synchronization
  const urlQuery = searchParams.get('q') || '';
  const urlTab = (searchParams.get('tab') as 'all' | 'archive' | 'p2p') || 'all';
  const urlWatchId = searchParams.get('watch');
  const urlMagnet = searchParams.get('magnet');
  const urlTitle = searchParams.get('title');

  const [catalog, setCatalog] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('p2pflix_auth_token');
  });
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Check with server if authentication is required
  useEffect(() => {
    fetch('/api/auth/status')
      .then((res) => res.json())
      .then((data) => {
        if (!data.requiresAuth) {
          setIsAuthenticated(true);
        }
      })
      .catch(() => {})
      .finally(() => setAuthChecking(false));
  }, []);

  // Watch history state (Unfinished & Completed)
  const [continueWatchingList, setContinueWatchingList] = useState<PlaybackProgress[]>([]);
  const [recentlyWatchedList, setRecentlyWatchedList] = useState<PlaybackProgress[]>([]);
  const [isTVModeOpen, setIsTVModeOpen] = useState(false);

  // Search input state
  const [searchInput, setSearchInput] = useState(urlQuery);
  const [isSearchingLive, setIsSearchingLive] = useState(false);
  const [liveSearchResults, setLiveSearchResults] = useState<VideoItem[]>([]);

  // Sync search input if URL changes externally
  useEffect(() => {
    setSearchInput(urlQuery);
  }, [urlQuery]);

  // Load Watch History from Neon DB / localStorage & listen for changes
  const refreshHistory = async () => {
    // 1. Instant load from local cache
    setContinueWatchingList(getContinueWatchingList());
    setRecentlyWatchedList(getRecentlyWatched());

    // 2. Fetch fresh data from Neon PostgreSQL database
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        if (data.continueWatching) setContinueWatchingList(data.continueWatching);
        if (data.recentlyWatched) setRecentlyWatchedList(data.recentlyWatched);
      }
    } catch (err) {
      // Keep local state on network error
    }
  };

  useEffect(() => {
    refreshHistory();

    const handleHistoryChanged = () => {
      refreshHistory();
    };

    window.addEventListener('p2pflix_history_changed', handleHistoryChanged);
    window.addEventListener('storage', handleHistoryChanged);

    return () => {
      window.removeEventListener('p2pflix_history_changed', handleHistoryChanged);
      window.removeEventListener('storage', handleHistoryChanged);
    };
  }, [urlWatchId]);

  // Fetch initial curated catalog for search fallback
  const fetchCatalog = async () => {
    try {
      const res = await fetch('/api/catalog');
      if (res.ok) {
        const data: VideoItem[] = await res.json();
        setCatalog(
          data.map((item) => ({
            ...item,
            source: 'curated',
            category: 'Feature Film',
          }))
        );
      }
    } catch (err: any) {
      console.error('Error fetching catalog:', err);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  // Whenever URL query changes, execute live search
  useEffect(() => {
    if (!urlQuery.trim()) {
      setLiveSearchResults([]);
      return;
    }

    let isMounted = true;
    setIsSearchingLive(true);

    fetch(`/api/search?q=${encodeURIComponent(urlQuery.trim())}&source=all`)
      .then((res) => {
        if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);
        return res.json();
      })
      .then((data) => {
        if (isMounted) {
          setLiveSearchResults(data.results || []);
        }
      })
      .catch((err) => {
        console.error('Search error:', err);
      })
      .finally(() => {
        if (isMounted) setIsSearchingLive(false);
      });

    return () => {
      isMounted = false;
    };
  }, [urlQuery]);

  // Handle Search Submission
  const handleSearchSubmit = (queryToSearch?: string) => {
    const q = (queryToSearch !== undefined ? queryToSearch : searchInput).trim();
    if (q) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.set('q', q);
      nextParams.delete('watch');
      setSearchParams(nextParams);
    } else {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('q');
      nextParams.delete('tab');
      setSearchParams(nextParams);
    }
  };

  // Handle Tab Switch
  const handleTabChange = (newTab: 'all' | 'archive' | 'p2p') => {
    const nextParams = new URLSearchParams(searchParams);
    if (newTab === 'all') {
      nextParams.delete('tab');
    } else {
      nextParams.set('tab', newTab);
    }
    setSearchParams(nextParams);
  };

  // Handle Video Selection -> Updates URL ?watch=id
  const handlePlayVideo = (video: VideoItem) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('watch', video.id);
    if (video.magnetLink && !video.streamUrl) {
      nextParams.set('magnet', video.magnetLink);
    } else {
      nextParams.delete('magnet');
    }
    if (video.title) {
      nextParams.set('title', video.title);
    }
    setSearchParams(nextParams);
  };

  // Handle Closing Video Player
  const handleClosePlayer = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('watch');
    nextParams.delete('magnet');
    nextParams.delete('title');
    setSearchParams(nextParams);
    refreshHistory();
  };

  const handleRemoveContinue = (videoId: string) => {
    removeVideoProgress(videoId);
    refreshHistory();
  };

  const handleRemoveRecent = (videoId: string) => {
    removeRecentWatched(videoId);
    refreshHistory();
  };

  const handleClearAllHistory = () => {
    if (window.confirm('Are you sure you want to clear your entire watch history?')) {
      clearAllWatchHistory();
      refreshHistory();
    }
  };

  // Compute displayed list based on active URL state
  const displayedVideos = useMemo(() => {
    if (urlQuery.trim() && liveSearchResults.length > 0) {
      if (urlTab === 'archive') {
        return liveSearchResults.filter((v) => v.source === 'archive');
      }
      if (urlTab === 'p2p') {
        return liveSearchResults.filter((v) => v.source === 'p2p');
      }
      return liveSearchResults;
    }

    if (urlQuery.trim() && liveSearchResults.length === 0 && !isSearchingLive) {
      return [];
    }

    return catalog;
  }, [catalog, liveSearchResults, urlQuery, urlTab, isSearchingLive]);

  // Resolve currently active video from URL parameters
  const activeVideo = useMemo<VideoItem | null>(() => {
    if (!urlWatchId) return null;

    // 1. Check in live search results
    const fromSearch = liveSearchResults.find((v) => v.id === urlWatchId);
    if (fromSearch) return fromSearch;

    // 2. Check in watch history
    const fromContinue = continueWatchingList.find((v) => v.videoId === urlWatchId);
    if (fromContinue) {
      return {
        id: fromContinue.videoId,
        title: fromContinue.title,
        year: 'Resume',
        duration: '',
        rating: '',
        description: '',
        poster: fromContinue.poster || '',
        backdrop: fromContinue.poster || '',
        magnetLink: fromContinue.magnetLink || '',
        streamUrl: fromContinue.streamUrl,
      };
    }

    const fromRecent = recentlyWatchedList.find((v) => v.videoId === urlWatchId);
    if (fromRecent) {
      return {
        id: fromRecent.videoId,
        title: fromRecent.title,
        year: 'Recent',
        duration: '',
        rating: '',
        description: '',
        poster: fromRecent.poster || '',
        backdrop: fromRecent.poster || '',
        magnetLink: fromRecent.magnetLink || '',
        streamUrl: fromRecent.streamUrl,
      };
    }

    // 3. Check in catalog
    const fromCatalog = catalog.find((v) => v.id === urlWatchId);
    if (fromCatalog) return fromCatalog;

    // 4. Archive item
    if (urlWatchId.startsWith('archive-')) {
      const id = urlWatchId.replace('archive-', '');
      return {
        id: urlWatchId,
        source: 'archive',
        identifier: id,
        title: urlTitle || id.replace(/[._]/g, ' '),
        category: 'Movie / Show',
        year: 'Stream',
        rating: '',
        duration: '',
        description: '',
        poster: `https://archive.org/services/img/${id}`,
        backdrop: `https://archive.org/services/img/${id}`,
        streamUrl: `/api/archive-stream?id=${encodeURIComponent(id)}`,
        magnetLink: '',
      };
    }

    // 5. Magnet item
    if (urlMagnet) {
      return {
        id: urlWatchId,
        source: 'p2p',
        title: urlTitle || 'Video Stream',
        category: 'Stream',
        year: new Date().getFullYear(),
        rating: '',
        duration: '',
        description: '',
        poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80',
        backdrop: 'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=1400&auto=format&fit=crop&q=80',
        magnetLink: urlMagnet,
      };
    }

    return null;
  }, [urlWatchId, urlMagnet, urlTitle, liveSearchResults, continueWatchingList, recentlyWatchedList, catalog]);

  const archiveCount = useMemo(
    () => liveSearchResults.filter((v) => v.source === 'archive').length,
    [liveSearchResults]
  );
  const p2pCount = useMemo(
    () => liveSearchResults.filter((v) => v.source === 'p2p').length,
    [liveSearchResults]
  );

  if (authChecking) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PasswordGate onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans selection:bg-red-600 selection:text-white">
      {/* Clean Navbar */}
      <Navbar
        searchQuery={searchInput}
        onSearchChange={setSearchInput}
        onSearchSubmit={handleSearchSubmit}
        isSearchingLive={isSearchingLive}
        totalResults={displayedVideos.length}
        onOpenTVMode={() => setIsTVModeOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* HOMESCREEN: Purely Continue Watching and Recently Watched */}
        {!urlQuery ? (
          <HistorySection
            continueWatching={continueWatchingList}
            recentlyWatched={recentlyWatchedList}
            onPlayItem={handlePlayVideo}
            onRemoveContinueWatching={handleRemoveContinue}
            onRemoveRecent={handleRemoveRecent}
            onClearAll={handleClearAllHistory}
          />
        ) : (
          /* SEARCH RESULTS VIEW */
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <Search className="w-5 h-5 text-red-500" />
                  Results for &ldquo;{urlQuery}&rdquo;
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Showing {displayedVideos.length} matching movies and shows
                </p>
              </div>

              {/* Filter Tabs synced with URL ?tab= */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
                <button
                  onClick={() => handleTabChange('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    urlTab === 'all'
                      ? 'bg-red-600 text-white shadow-md shadow-red-600/30'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  All ({displayedVideos.length})
                </button>
                <button
                  onClick={() => handleTabChange('archive')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    urlTab === 'archive'
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" /> Streams ({archiveCount})
                </button>
                <button
                  onClick={() => handleTabChange('p2p')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    urlTab === 'p2p'
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" /> Torrents ({p2pCount})
                </button>
                <button
                  onClick={() => {
                    setSearchInput('');
                    navigate('/');
                  }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-neutral-900 hover:bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-800 cursor-pointer"
                >
                  Clear Search
                </button>
              </div>
            </div>

            {/* Video Cards Grid */}
            {isSearchingLive ? (
              <div className="py-24 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-10 h-10 text-red-500 animate-spin mb-3" />
                <h4 className="text-base font-bold text-white mb-1">
                  Searching movies and shows...
                </h4>
                <p className="text-xs text-neutral-400">
                  Scanning verified video streams
                </p>
              </div>
            ) : displayedVideos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {displayedVideos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onPlay={handlePlayVideo}
                    isSelected={activeVideo?.id === video.id}
                  />
                ))}
              </div>
            ) : (
              /* Empty Search Results State */
              <div className="py-20 text-center bg-neutral-900/40 border border-neutral-800/60 rounded-2xl p-8">
                <Search className="w-10 h-10 text-neutral-600 mx-auto mb-3" />
                <h4 className="text-base font-bold text-white mb-1">
                  No results found for &ldquo;{urlQuery || searchInput}&rdquo;
                </h4>
                <p className="text-xs text-neutral-400 mb-4 max-w-md mx-auto">
                  Try searching for another movie or TV show.
                </p>
                <button
                  onClick={() => {
                    setSearchInput('');
                    navigate('/');
                  }}
                  className="px-4 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-white transition cursor-pointer"
                >
                  Return to Home
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-6 text-center text-xs text-neutral-600">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <button
            onClick={() => {
              setSearchInput('');
              navigate('/');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-neutral-400 hover:text-white font-semibold transition cursor-pointer"
          >
            Home
          </button>
          <div>Watch History &bull; Auto-Resume &bull; Episode Playback</div>
        </div>
      </footer>

      {/* TV Mode Pairing Modal for this machine */}
      <TVModeModal
        isOpen={isTVModeOpen}
        onClose={() => setIsTVModeOpen(false)}
        onGoHome={() => {
          setIsTVModeOpen(false);
          setSearchInput('');
          navigate('/');
        }}
        onPlayIncomingVideo={(video, _episode, _startTime) => {
          setIsTVModeOpen(false);
          handlePlayVideo(video);
        }}
      />

      {/* Active Video Player Modal */}
      {activeVideo && (
        <VideoPlayerModal
          video={activeVideo}
          onClose={handleClosePlayer}
          onGoHome={() => {
            handleClosePlayer();
            setSearchInput('');
            navigate('/');
          }}
          onSelectVideo={handlePlayVideo}
          allVideos={displayedVideos}
        />
      )}
    </div>
  );
};

export default App;
