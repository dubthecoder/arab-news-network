import { handleNews, handleStocks, handleLiveStreams, handleCors } from './api';
import { handleArticlePage, handleSitemap } from './ssr';
import { handleHomepage } from './seo';

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
}

interface Article {
  id: string;
  url: string;
  title: string;
  description: string;
  source: string;
  image: string;
  pubDate: string;
}

const MAX_ARTICLES = 2000;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return handleCors();
    }

    // API routes
    if (path === '/api/news') return handleNews(url, env);
    if (path === '/api/stocks') return handleStocks(env);
    if (path === '/api/live-streams') return handleLiveStreams(env);
    if (path === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok', service: 'arab-news-web' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // SSR routes
    if (path === '/sitemap.xml') return handleSitemap(env);
    const articleMatch = path.match(/^\/article\/([a-f0-9]+)$/);
    if (articleMatch) return handleArticlePage(articleMatch[1], env);

    // Homepage with SEO injection
    if (path === '/' || path === '') return handleHomepage(env);

    // Everything else: static assets
    return env.ASSETS.fetch(request);
  },

  async queue(batch: MessageBatch<Article[]>, env: Env): Promise<void> {
    console.log(`Processing queue batch: ${batch.messages.length} messages`);

    for (const message of batch.messages) {
      const articles = message.body;
      if (!articles || !Array.isArray(articles)) {
        message.ack();
        continue;
      }

      // Batch insert with INSERT OR IGNORE for deduplication
      const stmt = env.DB.prepare(
        `INSERT OR IGNORE INTO articles (id, url, title, description, source, image, pub_date)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );

      const ops = articles.map((a) =>
        stmt.bind(a.id, a.url, a.title, a.description, a.source, a.image, a.pubDate)
      );

      // D1 batch limit is 100 statements
      for (let i = 0; i < ops.length; i += 100) {
        await env.DB.batch(ops.slice(i, i + 100));
      }

      // Update existing articles that now have images
      const updateStmt = env.DB.prepare(
        `UPDATE articles SET image = ? WHERE id = ? AND (image IS NULL OR image = '')`
      );
      const updates = articles
        .filter((a) => a.image)
        .map((a) => updateStmt.bind(a.image, a.id));

      for (let i = 0; i < updates.length; i += 100) {
        await env.DB.batch(updates.slice(i, i + 100));
      }

      message.ack();
    }

    // Cap total articles
    await env.DB.prepare(
      `DELETE FROM articles WHERE id NOT IN (
        SELECT id FROM articles ORDER BY pub_date DESC LIMIT ${MAX_ARTICLES}
      )`
    ).run();

    console.log('Queue batch processed');
  },
};
