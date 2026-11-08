const TRACKERS = [
  'udp://tracker.opentrackr.org:1337/announce',
  'udp://open.stealth.si:80/announce',
  'udp://tracker.torrent.eu.org:451/announce',
  'udp://explodie.org:6969/announce',
  'wss://tracker.btorrent.xyz',
  'wss://tracker.fastcast.nz',
  'wss://tracker.openwebtorrent.com',
].map((t) => '&tr=' + encodeURIComponent(t)).join('');

// In-memory cache for Archive.org metadata to speed up repeated lookups
const archiveMetadataCache = new Map();

// In-memory cache for movie/show posters & metadata to ensure fast, rich posters
const posterMetadataCache = new Map();

/**
 * Fetches the real movie or TV show poster using OMDb API with local caching
 */
export async function fetchRealPoster(rawTitle, fallbackCategory = 'Movie') {
  const cleanTitle = extractCleanTitleForSearch(rawTitle);
  if (!cleanTitle || cleanTitle.length < 2) return null;

  const cacheKey = cleanTitle.toLowerCase();
  if (posterMetadataCache.has(cacheKey)) {
    return posterMetadataCache.get(cacheKey);
  }

  try {
    const res = await fetch(
      `https://www.omdbapi.com/?t=${encodeURIComponent(cleanTitle)}&apikey=trilogy`
    );
    if (!res.ok) return null;
    const data = await res.json();

    if (data.Response === 'True' && data.Poster && data.Poster !== 'N/A') {
      const result = {
        poster: data.Poster,
        backdrop: data.Poster,
        plot: data.Plot && data.Plot !== 'N/A' ? data.Plot : null,
        year: data.Year && data.Year !== 'N/A' ? data.Year : null,
        rating: data.imdbRating && data.imdbRating !== 'N/A' ? `IMDb ★ ${data.imdbRating}` : null,
      };
      posterMetadataCache.set(cacheKey, result);
      return result;
    }
  } catch (err) {
    // Silently fall back if network or API error occurs
  }

  // Fallback to TVMaze if it's a TV show or didn't hit on OMDb
  try {
    const res = await fetch(`https://api.tvmaze.com/singlesearch/shows?q=${encodeURIComponent(cleanTitle)}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.image) {
        const result = {
          poster: data.image.original || data.image.medium,
          backdrop: data.image.original || data.image.medium,
          plot: data.summary ? cleanHtml(data.summary) : null,
          year: data.premiered ? data.premiered.slice(0, 4) : null,
          rating: data.rating?.average ? `★ ${data.rating.average}` : null,
        };
        posterMetadataCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    // Ignore fallback errors
  }

  return null;
}

function extractCleanTitleForSearch(raw) {
  if (!raw) return '';

  // 1. Grab base name before year marker e.g. Inception (2010) or Inception.2010
  const yearMatch = raw.match(/[\(\s\._](19\d\d|20\d\d)[\)\s\._]?/);
  let base = raw;
  if (yearMatch && yearMatch.index > 0) {
    base = raw.substring(0, yearMatch.index);
  } else {
    // 2. Cut before standard release quality markers
    const tagMatch = base.match(/[\s\._](1080p|720p|2160p|4k|bluray|brrip|web-dl|webrip|s\d\d|season)/i);
    if (tagMatch && tagMatch.index > 0) {
      base = base.substring(0, tagMatch.index);
    }
  }

  // 3. Remove punctuation and clean whitespace
  base = base.replace(/[\._]/g, ' ');
  base = base.replace(/[\[\]\(\)\-_]/g, ' ');
  base = base.replace(/\s+/g, ' ').trim();

  return base || raw;
}

// Only filter actual non-video junk, malware, and spam files
const GARBAGE_TITLE_PATTERNS = [
  /\.exe\b/i,
  /\.iso\b/i,
  /\.zip\b/i,
  /\.rar\b/i,
  /keygen/i,
  /crack\b/i,
  /sample\s*only/i,
  /trailer\s*only/i,
];

// Valid movie & TV collections in Internet Archive
const PREFERRED_ARCHIVE_COLLECTIONS = new Set([
  'feature_films',
  'moviesandfilms',
  'classic_tv',
  'scifi',
  'animationandcartoons',
  'film_noir',
  'silent_films',
  'comedy_films',
  'horror_movies',
  'prelinger',
]);

/**
 * Searches the BitTorrent swarm network via ApiBay indexer with automatic proxy fallbacks
 */
export async function searchTorrents(query) {
  if (!query || !query.trim()) return [];
  const cleanQ = query.trim();
  const queryTokens = extractTokens(cleanQ);

  let items = [];

  // Primary: ApiBay JSON API
  try {
    const res = await fetch(`https://apibay.org/q.php?q=${encodeURIComponent(cleanQ)}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (res.ok) {
      const text = await res.text();
      const trimmed = text.trim();
      if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id !== '0') {
          items = parsed;
        }
      }
    }
  } catch (err) {
    console.warn('[SearchService] Primary ApiBay failed, attempting mirrors:', err.message);
  }

  // Secondary Fallback: tpb.party HTML proxy (in case ApiBay blocks the cloud datacenter)
  if (items.length === 0) {
    try {
      const proxyRes = await fetch(
        `https://tpb.party/search/${encodeURIComponent(cleanQ)}/1/99/200`,
        {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
        }
      );

      if (proxyRes.ok) {
        const html = await proxyRes.text();
        const rows = html.split('<tr>');
        for (const row of rows.slice(1)) {
          const magnetMatch = row.match(/href="(magnet:\?xt=urn:btih:[^"]+)"/i);
          const titleMatch = row.match(/title="Details for ([^"]+)"/i) || row.match(/class="detLink"[^>]*>([^<]+)/i);
          const seedersMatch = row.match(/<td align="right">(\d+)<\/td>/i);
          const sizeMatch = row.match(/<td align="right">([\d\.]+)&nbsp;([KMG]iB)<\/td>/i);

          if (magnetMatch && titleMatch) {
            const rawName = titleMatch[1];
            const hashMatch = magnetMatch[1].match(/urn:btih:([a-zA-Z0-9]+)/i);
            const seeders = seedersMatch ? parseInt(seedersMatch[1], 10) : 10;
            let size = 1024 * 1024 * 700; // default 700MB
            if (sizeMatch) {
              const num = parseFloat(sizeMatch[1]);
              const unit = sizeMatch[2];
              if (unit === 'GiB') size = num * 1024 * 1024 * 1024;
              else if (unit === 'MiB') size = num * 1024 * 1024;
            }

            items.push({
              id: hashMatch ? hashMatch[1].slice(0, 12) : `gen-${items.length}`,
              name: rawName,
              info_hash: hashMatch ? hashMatch[1] : '',
              seeders: seeders.toString(),
              leechers: '5',
              size: size.toString(),
              category: '201',
              directMagnet: magnetMatch[1],
            });
          }
        }
      }
    } catch (fallbackErr) {
      console.warn('[SearchService] Fallback mirror error:', fallbackErr.message);
    }
  }

  if (items.length === 0) {
    return [];
  }

  try {
    const filtered = items
      .filter((item) => {
        if (item.id === '0') return false;

        const seeders = parseInt(item.seeders, 10) || 0;
        const size = parseInt(item.size, 10) || 0;
        const name = item.name || '';

        // 1. Minimum seeders requirement: At least 1 active seeder
        if (seeders < 1) return false;

        // 2. Minimum file size: At least 50MB (supports short clips and episodes)
        if (size < 50 * 1024 * 1024) return false;

        // 3. Category filter: Must be Video (200 series) or uncategorized video release
        const cat = parseInt(item.category, 10) || 0;
        if (cat !== 0 && (cat < 200 || cat > 299)) return false;

        // 4. Junk file extension check (.exe, .iso, etc.)
        for (const pattern of GARBAGE_TITLE_PATTERNS) {
          if (pattern.test(name)) return false;
        }

        // 5. Keyword Relevance: title should match at least one search token
        if (queryTokens.length > 0) {
          const titleLower = name.toLowerCase();
          const matchesQuery = queryTokens.some((token) => titleLower.includes(token));
          if (!matchesQuery) return false;
        }

        return true;
      })
      // Sort by active seeders descending
      .sort((a, b) => (parseInt(b.seeders, 10) || 0) - (parseInt(a.seeders, 10) || 0))
      .slice(0, 30);

    const mapped = await Promise.all(
      filtered.map(async (item) => {
        const seeders = parseInt(item.seeders, 10) || 0;
        const leechers = parseInt(item.leechers, 10) || 0;
        const size = parseInt(item.size, 10) || 0;
        const rawName = item.name;
        const cleanName = formatReleaseTitle(rawName);
        const magnet =
          item.directMagnet ||
          `magnet:?xt=urn:btih:${item.info_hash}&dn=${encodeURIComponent(cleanName)}${TRACKERS}`;

        let category = 'Movie';
        if (item.category === '205' || item.category === '208' || /S\d\d|Season/i.test(rawName)) {
          category = 'TV Show';
        }

        const qualityBadge = detectQuality(rawName);

        // Fetch real movie or show poster from OMDb / TVMaze
        const metadata = await fetchRealPoster(rawName, category);
        const poster = metadata?.poster || getPosterPlaceholder(cleanName, category);
        const backdrop = metadata?.backdrop || poster;
        const year = metadata?.year || parseYear(rawName);
        const description =
          metadata?.plot ||
          `High-speed P2P release: ${qualityBadge} video with ${seeders} verified seeds in swarm.`;

        return {
          id: `p2p-${item.id}`,
          source: 'p2p',
          title: cleanName,
          rawTitle: rawName,
          category: `${category} • ${qualityBadge}`,
          seeders,
          leechers,
          size,
          year,
          rating: metadata?.rating || `${seeders} Active Seeders`,
          duration: formatFileSize(size),
          description,
          magnetLink: magnet,
          poster,
          backdrop,
        };
      })
    );

    return mapped;
  } catch (err) {
    console.error('[SearchService] P2P search error:', err.message);
    return [];
  }
}

/**
 * Searches Internet Archive for verified, high-quality TV shows and movies
 */
export async function searchArchive(query) {
  if (!query || !query.trim()) return [];
  const cleanQ = query.trim();
  const queryTokens = extractTokens(cleanQ);

  try {
    // Search Archive.org with filters restricted to movies/films with h.264 video
    const url = `https://archive.org/advancedsearch.php?q=mediatype:(movies)+AND+format:(h.264+OR+MP4)+AND+(${encodeURIComponent(
      cleanQ
    )})&fl[]=identifier,title,description,year,downloads,collection&sort[]=downloads+desc&rows=30&output=json`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    const data = await res.json();
    const docs = data.response?.docs || [];

    const filtered = docs
      .filter((doc) => {
        const title = doc.title || '';
        const id = doc.identifier || '';

        // 1. Reject executable and archive spam patterns
        for (const pattern of GARBAGE_TITLE_PATTERNS) {
          if (pattern.test(title) || pattern.test(id)) return false;
        }

        // 2. Relevance check
        if (queryTokens.length > 0) {
          const titleLower = `${title} ${id}`.toLowerCase();
          const matchesTitle = queryTokens.some((token) => titleLower.includes(token));
          if (!matchesTitle) return false;
        }

        return true;
      })
      .slice(0, 20);

    const mapped = await Promise.all(
      filtered.map(async (doc) => {
        const title = doc.title || doc.identifier;
        const cleanTitle = cleanArchiveTitle(title);
        let year = doc.year || 'Classic';
        const downloads = doc.downloads || 0;
        let poster = `https://archive.org/services/img/${doc.identifier}`;
        let backdrop = poster;
        let description = cleanHtml(doc.description);
        let rating = `${formatDownloads(downloads)} Views`;

        // Enhance with real movie poster if available
        const metadata = await fetchRealPoster(cleanTitle, 'Movie');
        if (metadata) {
          if (metadata.poster) poster = metadata.poster;
          if (metadata.backdrop) backdrop = metadata.backdrop;
          if (metadata.plot && (!description || description.length < 20)) {
            description = metadata.plot;
          }
          if (metadata.year && year === 'Classic') {
            year = metadata.year;
          }
          if (metadata.rating) {
            rating = `${metadata.rating} • ${formatDownloads(downloads)} Views`;
          }
        }

        return {
          id: `archive-${doc.identifier}`,
          source: 'archive',
          identifier: doc.identifier,
          title: cleanTitle,
          category: 'Instant Stream • Classic Film & TV',
          year,
          downloads,
          rating,
          duration: 'Feature Film',
          description:
            description ||
            'Public domain classic film preserved on the Internet Archive, streamable with instant seeking.',
          poster,
          backdrop,
          streamUrl: `/api/archive-stream?id=${encodeURIComponent(doc.identifier)}`,
          magnetLink: `magnet:?xt=urn:btih:&dn=${encodeURIComponent(title)}&ws=${encodeURIComponent(
            `https://archive.org/download/${doc.identifier}/`
          )}${TRACKERS}`,
        };
      })
    );

    return mapped;
  } catch (err) {
    console.error('[SearchService] Archive search error:', err.message);
    return [];
  }
}

/**
 * Resolves the primary playable MP4 video URL from Archive.org item metadata
 */
export async function getArchiveMediaUrl(identifier, specificFilename) {
  const cacheKey = `${identifier}:${specificFilename || 'default'}`;
  if (archiveMetadataCache.has(cacheKey)) {
    return archiveMetadataCache.get(cacheKey);
  }

  const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`);
  if (!res.ok) {
    throw new Error(`Archive item metadata not found: ${res.status}`);
  }
  const data = await res.json();
  const files = data.files || [];

  // If a specific episode filename is requested:
  if (specificFilename) {
    const found = files.find((f) => f.name === specificFilename || f.name.endsWith(specificFilename));
    if (found) {
      const result = {
        downloadUrl: `https://archive.org/download/${identifier}/${encodeURIComponent(found.name)}`,
        name: found.name,
        size: parseInt(found.size, 10) || 0,
      };
      archiveMetadataCache.set(cacheKey, result);
      return result;
    }
  }

  // Filter playable MP4 videos
  const mp4Files = files.filter(
    (f) => f.name.toLowerCase().endsWith('.mp4') && !f.name.toLowerCase().includes('_thumb')
  );

  if (mp4Files.length === 0) {
    const otherVideo = files.find(
      (f) =>
        (f.name.toLowerCase().endsWith('.mkv') || f.name.toLowerCase().endsWith('.webm')) &&
        !f.name.toLowerCase().includes('_thumb')
    );
    if (!otherVideo) throw new Error('No playable video file found in this archive item');
    const result = {
      downloadUrl: `https://archive.org/download/${identifier}/${encodeURIComponent(otherVideo.name)}`,
      name: otherVideo.name,
      size: parseInt(otherVideo.size, 10) || 0,
    };
    archiveMetadataCache.set(cacheKey, result);
    return result;
  }

  // Pick the best quality standard version
  const candidate = mp4Files.reduce((best, file) => {
    const size = parseInt(file.size, 10) || 0;
    if (!best) return file;
    return size > (parseInt(best.size, 10) || 0) ? file : best;
  }, null);

  const result = {
    downloadUrl: `https://archive.org/download/${identifier}/${encodeURIComponent(candidate.name)}`,
    name: candidate.name,
    size: parseInt(candidate.size, 10) || 0,
  };

  archiveMetadataCache.set(cacheKey, result);
  return result;
}

/**
 * Returns episode/file list for an item (either Archive.org identifier or Torrent ID)
 */
export async function getEpisodes(identifier, torrentId) {
  // If Archive item:
  if (identifier) {
    const res = await fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`);
    if (!res.ok) return [];
    const data = await res.json();
    const files = (data.files || []).filter(
      (f) =>
        (f.name.endsWith('.mp4') || f.name.endsWith('.mkv') || f.name.endsWith('.webm')) &&
        !f.name.includes('_thumb') &&
        (parseInt(f.size, 10) || 0) > 10 * 1024 * 1024
    );

    return files.map((f, idx) => {
      const cleanEpTitle = f.title || cleanEpisodeName(f.name);
      return {
        id: `ep-${idx}`,
        title: cleanEpTitle,
        fileName: f.name,
        size: parseInt(f.size, 10) || 0,
        formattedSize: formatFileSize(parseInt(f.size, 10) || 0),
        streamUrl: `/api/archive-stream?id=${encodeURIComponent(identifier)}&file=${encodeURIComponent(f.name)}`,
        episodeNumber: idx + 1,
      };
    });
  }

  // If BitTorrent item:
  if (torrentId) {
    const cleanId = torrentId.replace(/^p2p-/, '');
    const res = await fetch(`https://apibay.org/f.php?id=${encodeURIComponent(cleanId)}`);
    if (!res.ok) return [];
    const files = await res.json();
    if (!Array.isArray(files)) return [];

    const videoExtensions = ['.mp4', '.mkv', '.avi', '.webm', '.m4v'];
    const episodes = [];

    files.forEach((item, idx) => {
      const fileName = Array.isArray(item.name) ? item.name[0] : item.name;
      const size = parseInt(Array.isArray(item.size) ? item.size[0] : item.size, 10) || 0;
      const isVideo = videoExtensions.some((ext) => fileName.toLowerCase().endsWith(ext));

      if (isVideo && size > 30 * 1024 * 1024) {
        episodes.push({
          id: `ep-tor-${idx}`,
          title: cleanEpisodeName(fileName),
          fileName,
          size,
          formattedSize: formatFileSize(size),
          fileIndex: idx,
          episodeNumber: episodes.length + 1,
        });
      }
    });

    return episodes;
  }

  return [];
}

function cleanEpisodeName(fileName) {
  let name = fileName.replace(/\.[^/.]+$/, '');
  name = name.replace(/[._]/g, ' ');
  name = name.replace(/^\d{4}-\d{2}-\d{2}\s*-\s*/, '');
  name = name.replace(
    /\b(1080p|720p|2160p|4k|bluray|brrip|web-dl|webrip|x264|x265|hevc|dts|aac|truehd|remux|yify|galaxy|eztv)\b/gi,
    ''
  );
  name = name.replace(/[\[\]\(\)\-_]/g, ' ').replace(/\s+/g, ' ').trim();
  return name || fileName;
}

/**
 * Helper utilities
 */
function extractTokens(q) {
  return q
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

function formatReleaseTitle(raw) {
  let title = raw;
  // Replace underscores and dots with spaces
  title = title.replace(/[._]/g, ' ');
  // Clean release tags like 1080p, BluRay, x264, etc. from display title
  title = title.replace(
    /\b(1080p|720p|2160p|4k|bluray|brrip|web-dl|webrip|x264|x265|hevc|dts|aac|truehd|remux|proper|yify|galaxy|eztv|rarbg|ps)\b/gi,
    ''
  );
  title = title.replace(/[\[\]\(\)\-_]/g, ' ');
  title = title.replace(/\s+/g, ' ').trim();
  return title || raw;
}

function cleanArchiveTitle(title) {
  return title.replace(/[_]/g, ' ').replace(/\s+/g, ' ').trim();
}

function detectQuality(raw) {
  if (/2160p|4k/i.test(raw)) return '4K UHD';
  if (/1080p/i.test(raw)) return '1080p Full HD';
  if (/720p/i.test(raw)) return '720p HD';
  if (/BluRay|BRRip/i.test(raw)) return 'BluRay';
  if (/WEBRip|WEB-DL/i.test(raw)) return 'WEB-DL';
  return 'HD';
}

function parseYear(title) {
  const match = title.match(/\b(19\d\d|20\d\d)\b/);
  return match ? parseInt(match[1], 10) : new Date().getFullYear();
}

function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return 'Unknown size';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDownloads(num) {
  if (!num) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
  return num.toString();
}

function cleanHtml(str) {
  if (!str) return '';
  return str.replace(/<[^>]*>/g, '').trim();
}

function getPosterPlaceholder(title, category) {
  const lower = title.toLowerCase();
  if (lower.includes('space') || lower.includes('star') || lower.includes('interstellar')) {
    return 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=600&auto=format&fit=crop&q=80';
  }
  if (lower.includes('batman') || lower.includes('knight') || lower.includes('hero')) {
    return 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80';
  }
  if (lower.includes('sherlock') || lower.includes('detective') || lower.includes('noir')) {
    return 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=600&auto=format&fit=crop&q=80';
  }
  if (category.includes('TV Show')) {
    return 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=600&auto=format&fit=crop&q=80';
  }
  return 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&auto=format&fit=crop&q=80';
}
