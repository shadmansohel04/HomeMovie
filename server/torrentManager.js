import WebTorrent from 'webtorrent';

class TorrentManager {
  constructor() {
    this.client = new WebTorrent({
      maxConns: 55,
    });

    this.torrents = new Map();
    this.pending = new Map();

    this.client.on('error', (err) => {
      console.error('[WebTorrent Engine Error]:', err.message);
    });
  }

  /**
   * Retrieves an existing torrent or adds a new one to the client.
   * Resolves when the torrent's metadata is loaded and files are accessible.
   */
  async getTorrent(magnetUri) {
    if (!magnetUri) {
      throw new Error('Magnet URI is required');
    }

    // 1. Check local map
    if (this.torrents.has(magnetUri)) {
      const t = this.torrents.get(magnetUri);
      if (t && t.ready && t.files && t.files.length > 0) {
        return t;
      }
    }

    // 2. Check client.get
    const clientTorrent = await this.client.get(magnetUri);
    if (clientTorrent && clientTorrent.ready && clientTorrent.files && clientTorrent.files.length > 0) {
      this.torrents.set(magnetUri, clientTorrent);
      return clientTorrent;
    }

    // 3. Check if already pending
    if (this.pending.has(magnetUri)) {
      return this.pending.get(magnetUri);
    }

    // 4. Add torrent and await metadata
    const promise = new Promise((resolve, reject) => {
      console.log(`[TorrentManager] Adding torrent for magnet: ${magnetUri.slice(0, 60)}...`);

      let timeoutId = setTimeout(() => {
        this.pending.delete(magnetUri);
        reject(new Error('Timeout loading torrent metadata from peers/webseed.'));
      }, 30000);

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        this.pending.delete(magnetUri);
      };

      try {
        const onReady = (t) => {
          console.log(`[TorrentManager] Torrent metadata ready: "${t.name}" (${t.files.length} files)`);
          this.torrents.set(magnetUri, t);
          cleanup();
          resolve(t);
        };

        let torrent = clientTorrent;
        if (!torrent) {
          torrent = this.client.add(magnetUri, onReady);
        } else if (torrent.ready && torrent.files && torrent.files.length > 0) {
          this.torrents.set(magnetUri, torrent);
          cleanup();
          return resolve(torrent);
        } else {
          torrent.once('ready', () => onReady(torrent));
        }

        torrent.once('error', (err) => {
          console.error('[TorrentManager] Torrent error:', err.message);
          cleanup();
          reject(err);
        });
      } catch (err) {
        cleanup();
        reject(err);
      }
    });

    this.pending.set(magnetUri, promise);
    return promise;
  }

  /**
   * Identifies the largest file in the torrent (typically the main video stream)
   */
  getLargestFile(torrent) {
    if (!torrent || !torrent.files || torrent.files.length === 0) {
      return null;
    }

    return torrent.files.reduce((largest, file) => {
      return (!largest || file.length > largest.length) ? file : largest;
    }, null);
  }

  /**
   * Returns real-time P2P swarm statistics for a given magnet URI
   */
  async getStats(magnetUri) {
    let torrent = this.torrents.get(magnetUri);
    if (!torrent) {
      torrent = await this.client.get(magnetUri);
    }

    if (!torrent) {
      const isPending = this.pending.has(magnetUri);
      return {
        status: isPending ? 'connecting' : 'not_found',
        numPeers: 0,
        downloadSpeed: 0,
        uploadSpeed: 0,
        progress: 0,
        downloaded: 0,
        totalLength: 0
      };
    }

    const largestFile = this.getLargestFile(torrent);

    return {
      status: torrent.ready ? 'ready' : 'loading_metadata',
      name: torrent.name,
      fileName: largestFile ? largestFile.name : null,
      fileSize: largestFile ? largestFile.length : torrent.length,
      numPeers: torrent.numPeers || 0,
      downloadSpeed: torrent.downloadSpeed || 0,
      uploadSpeed: torrent.uploadSpeed || 0,
      progress: Math.min(1, Math.max(0, torrent.progress || 0)),
      downloaded: torrent.downloaded || 0,
      totalLength: torrent.length || 0,
      timeRemaining: torrent.timeRemaining || 0
    };
  }
}

export const torrentManager = new TorrentManager();
