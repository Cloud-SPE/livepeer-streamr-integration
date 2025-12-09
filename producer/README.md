## Livepeer Streamr Producer

This project exposes a lightweight WebSocket bridge that receives raw JSON payloads and republishes them to a configured [Streamr](https://streamr.network/) stream. It is designed to run alongside a producer process that pushes telemetry or metrics over a local WebSocket connection.

### Prerequisites

- Node.js 18+ (Node 20 recommended) and npm, or Docker 24+ with Docker Compose.
- A Streamr private key with publish permissions to your target stream.

### Configuration

1. Copy the sample environment file:  
   `cp producer/.env.sample producer/.env`
2. Edit `producer/.env` and provide either:
   - `STREAMR_ETH_ACCOUNT` **and** `STREAM_ID`, which will be combined as `<account>/<stream>`; or
   - `STREAMR_STREAM_ID` with the full stream identifier.
3. Optional configuration:
   - `WEBSOCKET_PORT` (default `8080`) controls the inbound WebSocket listener.
   - `LOG_LEVEL` (default `info`) controls the [pino](https://github.com/pinojs/pino) logger verbosity.

### Local Development

```bash
cd producer
npm install
npm start
```

The bridge listens on `ws://localhost:8080` by default. Connect with any WebSocket client and send JSON payloads; successful publishes return `{"status":"ok"}`. Invalid JSON or publish failures respond with an error message and are logged.

### Running with Docker Compose

```bash
docker compose build
WEBSOCKET_PORT=8080 docker compose up
```

Compose reads environment values from `producer/.env` for Streamr credentials. Export or set `WEBSOCKET_PORT` before `docker compose up` if you need a non-default port. The container maps the chosen port on both the host and container.

### Testing

Unit tests cover the message handling logic that validates payloads, publishes to Streamr, and returns acknowledgements.

```bash
cd producer
npm test
```

### Logging

Logs are emitted through `pino` and include connection identifiers, client addresses, and error details to make traceability straightforward in production environments.
