import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const { Pool } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://user:password@host/neondb';

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

/**
 * Initializes tables for continue watching and recently watched history in PostgreSQL
 */
export async function initDb() {
  const query = `
    CREATE TABLE IF NOT EXISTS watch_history (
      video_id VARCHAR(255) PRIMARY KEY,
      title VARCHAR(500) NOT NULL,
      playback_position NUMERIC DEFAULT 0,
      total_duration NUMERIC DEFAULT 0,
      percentage NUMERIC DEFAULT 0,
      updated_at BIGINT NOT NULL,
      poster TEXT,
      category VARCHAR(255),
      magnet_link TEXT,
      stream_url TEXT,
      current_episode_id VARCHAR(255),
      current_episode_title VARCHAR(500),
      is_completed BOOLEAN DEFAULT FALSE
    );

    CREATE INDEX IF NOT EXISTS idx_watch_history_updated_at ON watch_history(updated_at DESC);
  `;

  try {
    await pool.query(query);
    console.log('[Database] Neon PostgreSQL watch_history table initialized successfully.');
  } catch (err) {
    console.error('[Database] Error initializing table:', err.message);
  }
}

/**
 * Upsert playback progress into Neon Postgres
 */
export async function savePlaybackProgress(item) {
  const isCompleted = item.percentage >= 92 || (item.duration - item.currentTime < 90);

  const query = `
    INSERT INTO watch_history (
      video_id, title, playback_position, total_duration, percentage, updated_at,
      poster, category, magnet_link, stream_url, current_episode_id, current_episode_title, is_completed
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    ON CONFLICT (video_id)
    DO UPDATE SET
      title = EXCLUDED.title,
      playback_position = EXCLUDED.playback_position,
      total_duration = EXCLUDED.total_duration,
      percentage = EXCLUDED.percentage,
      updated_at = EXCLUDED.updated_at,
      poster = COALESCE(EXCLUDED.poster, watch_history.poster),
      category = COALESCE(EXCLUDED.category, watch_history.category),
      magnet_link = COALESCE(EXCLUDED.magnet_link, watch_history.magnet_link),
      stream_url = COALESCE(EXCLUDED.stream_url, watch_history.stream_url),
      current_episode_id = EXCLUDED.current_episode_id,
      current_episode_title = EXCLUDED.current_episode_title,
      is_completed = EXCLUDED.is_completed;
  `;

  const values = [
    item.videoId,
    item.title,
    item.currentTime || 0,
    item.duration || 0,
    item.percentage || 0,
    item.updatedAt || Date.now(),
    item.poster || null,
    item.category || null,
    item.magnetLink || null,
    item.streamUrl || null,
    item.currentEpisodeId || null,
    item.currentEpisodeTitle || null,
    isCompleted,
  ];

  await pool.query(query, values);
}

/**
 * Retrieves continue watching items (unfinished)
 */
export async function getContinueWatching() {
  const query = `
    SELECT 
      video_id as "videoId",
      title,
      playback_position as "currentTime",
      total_duration as "duration",
      percentage,
      updated_at as "updatedAt",
      poster,
      category,
      magnet_link as "magnetLink",
      stream_url as "streamUrl",
      current_episode_id as "currentEpisodeId",
      current_episode_title as "currentEpisodeTitle"
    FROM watch_history
    WHERE is_completed = FALSE AND playback_position >= 1
    ORDER BY updated_at DESC
    LIMIT 30;
  `;
  const res = await pool.query(query);
  return res.rows.map(mapRow);
}

/**
 * Retrieves all recently watched items (both in-progress and completed)
 */
export async function getRecentlyWatched() {
  const query = `
    SELECT 
      video_id as "videoId",
      title,
      playback_position as "currentTime",
      total_duration as "duration",
      percentage,
      updated_at as "updatedAt",
      poster,
      category,
      magnet_link as "magnetLink",
      stream_url as "streamUrl",
      current_episode_id as "currentEpisodeId",
      current_episode_title as "currentEpisodeTitle",
      is_completed as "isCompleted"
    FROM watch_history
    ORDER BY updated_at DESC
    LIMIT 50;
  `;
  const res = await pool.query(query);
  return res.rows.map(mapRow);
}

/**
 * Deletes item from watch history
 */
export async function deleteWatchProgress(videoId) {
  await pool.query('DELETE FROM watch_history WHERE video_id = $1', [videoId]);
}

/**
 * Clears all history
 */
export async function clearAllWatchHistory() {
  await pool.query('DELETE FROM watch_history');
}

function mapRow(row) {
  return {
    ...row,
    currentTime: parseFloat(row.currentTime) || 0,
    duration: parseFloat(row.duration) || 0,
    percentage: parseInt(row.percentage, 10) || 0,
    updatedAt: parseInt(row.updatedAt, 10) || Date.now(),
  };
}
