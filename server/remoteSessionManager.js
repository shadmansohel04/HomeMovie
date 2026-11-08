import { WebSocketServer, WebSocket } from 'ws';

/**
 * Manages TV screen sessions and remote casting.
 * Rooms are identified by a 6-character alphanumeric pairing code (e.g., "TV-4829").
 */
class RemoteSessionManager {
  constructor() {
    this.rooms = new Map(); // code -> { tvWs: WebSocket, clients: Set<WebSocket> }
    this.wsToCode = new Map(); // ws -> code
    this.wsRole = new Map(); // ws -> 'tv' | 'remote'
  }

  generateCode() {
    let code;
    do {
      code = Math.floor(100000 + Math.random() * 900000).toString();
    } while (this.rooms.has(code));
    return code;
  }

  attach(server) {
    this.wss = new WebSocketServer({ server, path: '/ws/remote' });

    this.wss.on('connection', (ws, req) => {
      console.log('[RemoteWS] Connection established');

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(ws, data);
        } catch (err) {
          console.error('[RemoteWS] Invalid message format:', err.message);
        }
      });

      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      ws.on('error', (err) => {
        console.error('[RemoteWS] Socket error:', err.message);
      });
    });

    console.log('[RemoteWS] WebSocket Server attached to HTTP server at /ws/remote');
  }

  handleMessage(ws, data) {
    const { action } = data;

    switch (action) {
      // A device registers as a TV display
      case 'REGISTER_TV': {
        // If an existing code was passed and still valid or generate a fresh one
        let code = data.requestedCode;
        if (!code || this.rooms.has(code)) {
          code = this.generateCode();
        }

        const room = {
          tvWs: ws,
          clients: new Set(),
        };

        this.rooms.set(code, room);
        this.wsToCode.set(ws, code);
        this.wsRole.set(ws, 'tv');

        console.log(`[RemoteWS] TV Screen registered with code: ${code}`);

        ws.send(
          JSON.stringify({
            event: 'TV_REGISTERED',
            code,
          })
        );
        break;
      }

      // A controller device connects to a TV using a code
      case 'PAIR_REMOTE': {
        const targetCode = (data.code || '').trim();
        const room = this.rooms.get(targetCode);

        if (!room || !room.tvWs || room.tvWs.readyState !== WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              event: 'PAIR_FAILED',
              message: 'Invalid TV code or the TV screen is offline.',
            })
          );
          return;
        }

        room.clients.add(ws);
        this.wsToCode.set(ws, targetCode);
        this.wsRole.set(ws, 'remote');

        console.log(`[RemoteWS] Remote paired with TV [${targetCode}]`);

        ws.send(
          JSON.stringify({
            event: 'PAIR_SUCCESS',
            code: targetCode,
          })
        );

        // Notify TV that a remote connected
        room.tvWs.send(
          JSON.stringify({
            event: 'REMOTE_CONNECTED',
            remoteCount: room.clients.size,
          })
        );
        break;
      }

      // A controller casts a video to the TV
      case 'CAST_VIDEO': {
        const targetCode = (data.code || this.wsToCode.get(ws) || '').trim();
        const room = this.rooms.get(targetCode);

        if (!room || !room.tvWs || room.tvWs.readyState !== WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              event: 'CAST_FAILED',
              message: 'Target TV screen is not connected.',
            })
          );
          return;
        }

        console.log(`[RemoteWS] Casting video "${data.video?.title}" to TV [${targetCode}]`);

        // Forward video payload to the TV with instruction to open fullscreen and play
        room.tvWs.send(
          JSON.stringify({
            event: 'PLAY_ON_TV',
            video: data.video,
            episode: data.episode,
            startTime: data.startTime || 0,
            forceFullscreen: true,
          })
        );

        // Confirm to remote sender
        ws.send(
          JSON.stringify({
            event: 'CAST_SUCCESS',
            code: targetCode,
            videoTitle: data.video?.title,
          })
        );
        break;
      }

      // Media controls from remote (pause, play, seek)
      case 'MEDIA_CONTROL': {
        const targetCode = (data.code || this.wsToCode.get(ws) || '').trim();
        const room = this.rooms.get(targetCode);

        if (room && room.tvWs && room.tvWs.readyState === WebSocket.OPEN) {
          room.tvWs.send(
            JSON.stringify({
              event: 'MEDIA_COMMAND',
              command: data.command, // 'play', 'pause', 'seek', 'stop'
              value: data.value,
            })
          );
        }
        break;
      }

      default:
        console.warn('[RemoteWS] Unknown action:', action);
    }
  }

  handleDisconnect(ws) {
    const code = this.wsToCode.get(ws);
    const role = this.wsRole.get(ws);

    if (code && this.rooms.has(code)) {
      const room = this.rooms.get(code);

      if (role === 'tv') {
        console.log(`[RemoteWS] TV [${code}] closed connection`);
        // Notify all connected remotes that the TV disconnected
        for (const client of room.clients) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                event: 'TV_DISCONNECTED',
                code,
              })
            );
          }
        }
        this.rooms.delete(code);
      } else if (role === 'remote') {
        room.clients.delete(ws);
        console.log(`[RemoteWS] Remote disconnected from TV [${code}]`);
      }
    }

    this.wsToCode.delete(ws);
    this.wsRole.delete(ws);
  }
}

export const remoteSessionManager = new RemoteSessionManager();
