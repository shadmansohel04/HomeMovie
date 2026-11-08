# HomeMovie

Full-stack real-time video streaming application featuring P2P WebTorrent streaming, Internet Archive cloud proxy, TV Mode with remote fullscreen casting, Neon PostgreSQL watch history synchronization, and gated access protection.

## Deployment & Links

- **GitHub Repository**: [https://github.com/shadmansohel04/HomeMovie](https://github.com/shadmansohel04/HomeMovie)
- **Live Backend (Render)**: [https://homemovie.onrender.com](https://homemovie.onrender.com)
- **Database**: [Neon Serverless PostgreSQL](https://neon.tech) (US East 2 / AWS pooler)

---

## Features

- **P2P Video Streaming**: Instant media streaming with WebTorrent using HTTP 206 Partial Content byte-range scrubbing.
- **Calibrated Movie & TV Show Search**: Live search across BitTorrent swarms and Internet Archive media with real theatrical posters and metadata from OMDb.
- **TV Mode & Remote Fullscreen Casting**: Display a unique 6-digit pairing code on any TV/monitor and cast videos in fullscreen from your phone or laptop in real-time over WebSockets.
- **Cross-Device Watch History**: Cloud-synchronized Continue Watching and Recently Watched playback tracking powered by Neon PostgreSQL with instant local browser cache fallback.
- **Auto-Credit Detection & Smart Resume**: Intelligently marks videos completed at credit roll (&ge;92% watched) and resumes in-progress media at the exact second left off.
- **Access Gate Protection**: Optional first-time password verification configurable via environment variables.
- **Clean Dark Mode UI**: Modern responsive interface built with React, Vite, and Tailwind CSS.

---

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/shadmansohel04/HomeMovie.git
cd HomeMovie

# Install root dependencies
npm install

# Install client and server dependencies
cd server && npm install
cd ../client && npm install
cd ..
```

### Environment Configuration

#### Backend (`server/.env`)

```env
DATABASE_URL="postgresql://neondb_owner:<password>@ep-redacted-pooler.c-9.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
PORT=5000
APP_PASSWORD=panthapria
```

#### Frontend (`client/.env`)

```env
# For local development:
VITE_API_BASE_URL=http://localhost:5000

# For deployed production:
# VITE_API_BASE_URL=https://homemovie.onrender.com
```

### Running the App

```bash
# Start backend server
node server/index.js

# Start frontend dev server
cd client && npm run dev

# Or build frontend for production
cd client && npm run build
```
