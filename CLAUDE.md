# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Arab News Network — a live Arabic news aggregator deployed at [arabnews.network](https://arabnews.network). Arabic-only, RTL throughout. No English version.

## Architecture

Three independent microservices deployed on Railway, plus a Redis instance:

- **worker/** — Background process that fetches Arabic RSS feeds every 2 minutes, extracts og:image for articles missing images, and stores results in Redis (`news:ar` key, 5min TTL).
- **api/** — Express 5 REST API that reads from Redis and serves articles. Single endpoint: `GET /news?since=<ISO timestamp>`.
- **frontend/** — Express 5 static server + API proxy. The entire UI is a single `public/index.html` file (vanilla HTML/CSS/JS, no build step). Proxies `/api/*` to the internal API service.

Data flow: `RSS feeds → worker → Redis → api → frontend proxy → browser`

## Development

Each service is independent with its own `package.json`. No monorepo tooling.

```bash
# Run locally (each in separate terminal, needs Redis running)
cd worker && npm start    # port 3002
cd api && npm start       # port 3001
cd frontend && npm start  # port 3000

# API_URL env var in frontend points to the API (default: http://localhost:3001)
# REDIS_URL env var for worker and api (default: redis://localhost:6379)
```

No tests, no linter, no build step.

## Deployment

All services deploy to Railway via git push to `main`. Each service has a `railway.toml` using the Railpack builder. Railway auto-detects the root directory per service.

## Key Design Decisions

- **Single-file frontend**: Everything (CSS, JS, HTML) lives in `frontend/public/index.html`. No framework, no bundler.
- **Client-side categorization**: Articles are categorized into sections (politics, economy, sports, tech, culture) by keyword matching in the browser, not on the server.
- **og:image fallback**: Many RSS feeds (Al Jazeera, etc.) don't include images. The worker fetches the first 30KB of each article page to extract og:image meta tags.
- **API proxy**: Frontend proxies `/api/*` to keep the internal API URL private.
- **Polling**: Frontend polls `/api/news` every 30 seconds for new articles. Shows a "new articles" banner if user has scrolled down.

## RSS Feeds

Arabic feeds are defined in `worker/worker.js` in the `RSS_FEEDS` array. When adding feeds, test with `curl` first — some sites (Al Arabiya, Al Hadath) block RSS access with 403s.

## Frontend Structure (index.html)

- CSS variables at top define the Arab News-inspired theme (`--primary-red: #D85229`, `--bg-main: #ECF0E7`)
- Dark theme support via `[data-theme="dark"]`
- Hero section: full-width image with dark gradient overlay and white text
- Sections rendered by `buildSection()` with 3 tiers: featured row, image grid, brief list
- Sidebar with latest stories, trending ticker bar
- Umami analytics integrated
