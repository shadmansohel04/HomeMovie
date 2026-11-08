import express from 'express';
import http from 'http';
import cors from 'cors';
import mime from 'mime-types';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { CATALOG } from './catalog.js';
import { torrentManager } from './torrentManager.js';
import { searchTorrents, searchArchive, getArchiveMediaUrl, getEpisodes } from './searchService.js';
import { remoteSessionManager } from './remoteSessionManager.js';
import {
  initDb,
  savePlaybackProgress,
  getContinueWatching,
  getRecentlyWatched,
  deleteWatchProgress,
  clearAllWatchHistory,
} from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.join(__dirname, '../client/dist');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

// Attach WebSocket Server for TV Pairing & Remote Casting
remoteSessionManager.attach(server);

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    if (!req.url.startsWith('/api/stats')) {
      console.log(`[${req.method}] ${req.url} -> ${res.statusCode} (${Date.now() - start}ms)`);
    }
  });
  next();
});

/**
 * 1. Catalog API Endpoint
 * Returns a hardcoded JSON array of public domain videos with title, magnetLink, and metadata.
 */
app.get('/api/catalog', (req, res) => {
  res.json(CATALOG);
});

/**
 * Watch History & Progress API Endpoints (Neon Postgres backed)
 */
app.get('/api/history', async (req, res) => {
  try {
    const continueWatching = await getContinueWatching();
    const recentlyWatched = await getRecentlyWatched();
    res.json({ continueWatching, recentlyWatched });
  } catch (err) {
    console.error('Error fetching watch history:', err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

app.post('/api/history', async (req, res) => {
  try {
    const item = req.body;
    if (!item || !item.videoId) {
      return res.status(400).json({ error: 'videoId is required' });
    }
    await savePlaybackProgress(item);
    res.json({ success: true });
  } catch (err) {
    console.error('Error saving watch history:', err);
    res.status(500).json({ error: 'Failed to save progress' });
  }
});

app.delete('/api/history/:videoId', async (req, res) => {
  try {
    await deleteWatchProgress(req.params.videoId);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting watch history:', err);
    res.status(500).json({ error: 'Failed to delete history' });
  }
});

app.delete('/api/history', async (req, res) => {
  try {
    await clearAllWatchHistory();
    res.json({ success: true });
  } catch (err) {
    console.error('Error clearing watch history:', err);
    res.status(500).json({ error: 'Failed to clear history' });
  }
});

/**
 * Real Search API Endpoint
 * Queries live TV and movies across BitTorrent P2P swarms and Archive.org
 */
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  const source = req.query.source || 'all'; // 'all', 'p2p', 'archive'

  if (!query || !query.trim()) {
    return res.status(400).json({ error: 'Search query parameter (q) is required' });
  }

  try {
    const promises = [];
    if (source === 'all' || source === 'archive') {
      promises.push(searchArchive(query));
    }
    if (source === 'all' || source === 'p2p') {
      promises.push(searchTorrents(query));
    }

    const results = await Promise.all(promises);
    const combined = results.flat();

    res.json({
      query,
      count: combined.length,
      results: combined,
    });
  } catch (err) {
    console.error('[API Search Error]:', err.message);
    res.status(500).json({ error: 'Failed to search video catalog: ' + err.message });
  }
});

/**
 * Archive.org Direct Stream Range Proxy
 * Streams full TV/movies from the Internet Archive with instant HTTP 206 scrubbing
 */
app.get('/api/archive-stream', async (req, res) => {
  const identifier = req.query.id;
  if (!identifier) {
    return res.status(400).json({ error: 'Missing archive identifier' });
  }

  try {
    const media = await getArchiveMediaUrl(identifier);
    const rangeHeader = req.headers.range;

    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    };
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const response = await fetch(media.downloadUrl, {
      headers: fetchHeaders,
    });

    if (!response.ok && response.status !== 206) {
      return res.status(response.status).json({ error: 'Upstream archive stream error' });
    }

    // Forward range and streaming headers
    res.status(response.status);
    const headersToForward = [
      'content-range',
      'content-length',
      'content-type',
      'accept-ranges',
    ];

    headersToForward.forEach((h) => {
      const val = response.headers.get(h);
      if (val) res.setHeader(h, val);
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'no-cache');

    // Pipe upstream body to client
    const nodeStream = response.body;
    if (nodeStream) {
      const { Readable } = await import('stream');
      const stream = Readable.fromWeb(nodeStream);
      stream.pipe(res);
      req.on('close', () => {
        stream.destroy();
      });
    } else {
      res.end();
    }
  } catch (err) {
    console.error('[Archive Stream Error]:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message });
    }
  }
});

/**
 * 2. Real-time P2P Swarm Stats Endpoint
 * Allows frontend to show live peer count, download speed, and progress.
 */
app.get('/api/stats', async (req, res) => {
  const magnet = req.query.magnet;
  if (!magnet) {
    return res.status(400).json({ error: 'Missing magnet query parameter' });
  }
  const stats = await torrentManager.getStats(magnet);
  res.json(stats);
});

/**
 * 3. Video Streaming Endpoint with HTTP 206 Range Support
 * Initializes/retrieves the WebTorrent client for the magnet link,
 * finds the largest video file, and pipes requested byte ranges directly to Express response.
 */
app.get('/api/stream', async (req, res) => {
  const magnet = req.query.magnet;
  if (!magnet) {
    return res.status(400).json({ error: 'Missing magnet query parameter' });
  }

  try {
    // Retrieve or initialize the torrent engine for this magnet link
    const torrent = await torrentManager.getTorrent(magnet);
    const file = torrentManager.getLargestFile(torrent);

    if (!file) {
      return res.status(404).json({ error: 'No streamable video file found in this torrent' });
    }

    const fileSize = file.length;
    // Determine proper MIME type or fallback to video/mp4
    const mimeType = mime.lookup(file.name) || 'video/mp4';
    const rangeHeader = req.headers.range;

    // Handle HTTP Range Requests (Status 206 Partial Content) for scrubbing and buffering
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      // Validate byte range bounds
      if (isNaN(start) || start >= fileSize || end >= fileSize || start > end) {
        res.status(416).set('Content-Range', `bytes */${fileSize}`);
        return res.end();
      }

      const chunkSize = (end - start) + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mimeType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      });

      // Create stream for the requested byte slice and pipe directly to response
      const stream = file.createReadStream({ start, end });
      stream.pipe(res);

      req.on('close', () => {
        stream.destroy();
      });

      stream.on('error', (err) => {
        console.error(`[Stream Error] ${file.name}:`, err.message);
        if (!res.headersSent) {
          res.status(500).end();
        }
      });
    } else {
      // Full content delivery (Status 200) when no Range header is provided
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
      });

      const stream = file.createReadStream();
      stream.pipe(res);

      req.on('close', () => {
        stream.destroy();
      });

      stream.on('error', (err) => {
        console.error(`[Stream Error] ${file.name}:`, err.message);
        if (!res.headersSent) {
          res.status(500).end();
        }
      });
    }
  } catch (err) {
    console.error(`[Streaming Error]:`, err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: `Streaming error: ${err.message}` });
    }
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Serve frontend static build if available
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.use((req, res) => {
    if (!req.url.startsWith('/api')) {
      res.sendFile(path.join(clientDistPath, 'index.html'));
    } else {
      res.status(404).json({ error: 'Endpoint not found' });
    }
  });
}

server.listen(PORT, async () => {
  await initDb();
  console.log(`===============================================`);
  console.log(` WebTorrent Video Streaming Server`);
  console.log(` Running on: http://localhost:${PORT}`);
  console.log(` Catalog:    http://localhost:${PORT}/api/catalog`);
  console.log(` Stream:     http://localhost:${PORT}/api/stream?magnet=...`);
  console.log(` TV Remote:  ws://localhost:${PORT}/ws/remote`);
  console.log(`===============================================`);
});
