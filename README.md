# Arab News Network

A real-time Middle East news aggregator that pulls from major international and regional RSS feeds, serving a bilingual (English/Arabic) live news interface.

**Live at [arabnews.network](https://arabnews.network)**

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=flat&logo=redis&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=flat&logo=railway&logoColor=white)

## Features

- **Live news feed** from 10 RSS sources, updated every 2 minutes
- **Bilingual** — full English and Arabic support with RTL layout
- **Microservices architecture** — three independently deployable services
- **Category filtering** — Latest News, Middle East, World, Saudi Arabia, Business, Sport, Media
- **Breaking news ticker** and new article notifications
- **Responsive design** with dark/light mode support
- **Zero-build frontend** — vanilla JS, no bundler required

## News Sources

**English:** BBC Middle East, Al Jazeera, NY Times Middle East, The Guardian Middle East, Al Arabiya English

**Arabic:** Al Jazeera Arabic, BBC Arabic, France 24 Arabic, RT Arabic, Alhurra

## Architecture

The app is split into three microservices that communicate through Redis:

```
┌────────────┐     ┌────────────┐     ┌────────────┐
│  Frontend   │────▶│    API     │◀────│   Worker   │
│  :3000      │     │   :3001    │     │   :3002    │
│             │     │            │     │            │
│ Serves SPA  │     │ REST API   │     │ RSS Fetcher│
└────────────┘     └─────┬──────┘     └─────┬──────┘
                         │                  │
                         └──────┬───────────┘
                              Redis
```

| Service | Role |
|---------|------|
| **Frontend** | Express server that serves the SPA and injects the API URL at runtime |
| **API** | REST API that reads cached articles from Redis and serves them with CORS |
| **Worker** | Background process that fetches RSS feeds every 2 minutes and caches results in Redis |

## Getting Started

### Prerequisites

- Node.js
- Redis

### Local Development

1. **Start Redis** (or use a managed instance):
   ```bash
   redis-server
   ```

2. **Install dependencies and start each service:**

   ```bash
   # Terminal 1 — Worker
   cd worker && npm install && npm start

   # Terminal 2 — API
   cd api && npm install && npm start

   # Terminal 3 — Frontend
   cd frontend && npm install && npm start
   ```

3. Open `http://localhost:3000`

### Environment Variables

| Variable | Service | Default | Description |
|----------|---------|---------|-------------|
| `PORT` | all | 3000 / 3001 / 3002 | Service port |
| `REDIS_URL` | api, worker | `redis://localhost:6379` | Redis connection string |
| `API_URL` | frontend | `http://localhost:3001` | API endpoint injected into the SPA |
| `FRONTEND_URL` | api | `*` | Allowed CORS origin |

## API

### `GET /news`

Returns cached news articles.

| Parameter | Type | Description |
|-----------|------|-------------|
| `lang` | `en` \| `ar` | Language (default: `en`) |
| `since` | ISO 8601 | Only return articles published after this date |

**Response:**
```json
{
  "articles": [
    {
      "title": "...",
      "link": "https://...",
      "description": "...",
      "pubDate": "2026-03-06T12:00:00Z",
      "source": "BBC",
      "image": "https://..."
    }
  ],
  "timestamp": "2026-03-06T12:01:00Z"
}
```

### `GET /health`

Returns `200 OK` if the API is running.

## Deployment

Each service has a `railway.toml` configured for [Railway](https://railway.app) deployment with NIXPACKS. Add a Redis instance to your Railway project and link the services via environment variables.

## Tech Stack

- **Runtime:** Node.js (CommonJS)
- **Server:** Express v5
- **RSS Parsing:** rss-parser
- **Cache:** Redis (ioredis)
- **Frontend:** Vanilla HTML/CSS/JS
- **Deployment:** Railway + NIXPACKS

## License

MIT
