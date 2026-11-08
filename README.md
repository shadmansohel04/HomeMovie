# HomeMovie

Full-stack real-time streaming application featuring P2P WebTorrent streaming, Internet Archive integration, TV Mode with remote fullscreen casting, and local browser state persistence.

## Features

- **P2P Video Streaming**: Instant media streaming with WebTorrent using HTTP 206 Partial Content byte-range scrubbing.
- **Movie & Show Search**: Search live P2P swarms and Internet Archive media with real theatrical posters and metadata from OMDb.
- **TV Mode & Remote Fullscreen Casting**: Display a 6-digit pairing code on one device and cast videos in fullscreen from any phone, laptop, or other screen in real-time over WebSockets.
- **Watch History & Auto-Resume**: Continue Watching and Recently Watched playback tracking with intelligent credit roll detection and timestamp memory.
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

### Running the App

```bash
# Start backend server
node server/index.js

# Build client
cd client && npm run build
```
