# HomeMovie

Full-stack real-time streaming application featuring P2P WebTorrent streaming, Internet Archive integration, TV Mode with remote fullscreen casting, watch history backed by Neon PostgreSQL, and a modern responsive interface.

## Live Deployment

- **Web App**: [https://homemovie-o8ag.onrender.com/](https://homemovie-o8ag.onrender.com/)

## Features

- **P2P Video Streaming**: Instant media streaming with WebTorrent using HTTP 206 Partial Content byte-range scrubbing.
- **Movie & Show Search**: Search live P2P swarms and Internet Archive media with real theatrical posters and metadata from OMDb.
- **TV Mode & Remote Fullscreen Casting**: Display a 6-digit pairing code on one device and cast videos in fullscreen from any phone, laptop, or other screen in real-time over WebSockets.
- **Watch History & Auto-Resume**: Continue Watching and Recently Watched playback tracking backed by Neon PostgreSQL with intelligent credit roll detection and timestamp memory.
- **Clean Dark Mode UI**: Modern responsive interface built with React, Vite, and Tailwind CSS.

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

Create a `.env` file in the `server` directory (see `server/.env.example`):

```env
DATABASE_URL="postgresql://user:password@host/neondb?sslmode=require"
PORT=5000
APP_PASSWORD=panthapria
```

### Running the App Locally

```bash
# 1. Start backend server (port 5000)
node server/index.js

# 2. In a separate terminal, start Vite client dev server or build:
cd client && npm run dev
# or build for production:
cd client && npm run build
```
