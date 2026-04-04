import { fetchFeeds, type Article } from './feeds';
import { fetchStocks } from './stocks';

export interface Env {
  DB: D1Database;
  ARTICLE_QUEUE: Queue<Article[]>;
}

const ARTICLE_MAX_AGE_DAYS = 7;
const QUEUE_BATCH_SIZE = 50;

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`Cron triggered at ${new Date(event.scheduledTime).toISOString()}`);

    // Run feeds and stocks in parallel
    const [articles] = await Promise.all([fetchFeeds(), fetchStocks(env.DB)]);

    // Send articles to queue in batches
    if (articles.length > 0) {
      const batches: Article[][] = [];
      for (let i = 0; i < articles.length; i += QUEUE_BATCH_SIZE) {
        batches.push(articles.slice(i, i + QUEUE_BATCH_SIZE));
      }
      for (const batch of batches) {
        await env.ARTICLE_QUEUE.send(batch);
      }
      console.log(`Enqueued ${articles.length} articles in ${batches.length} batches`);
    }

    // Purge old articles
    await env.DB.prepare(
      `DELETE FROM articles WHERE pub_date < datetime('now', '-${ARTICLE_MAX_AGE_DAYS} days')`
    ).run();
  },

  // Health check fetch handler (for manual testing)
  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response(JSON.stringify({ status: 'ok', service: 'arab-news-worker' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  },
};
