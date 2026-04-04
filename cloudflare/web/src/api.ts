import type { Env } from './index';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

export async function handleNews(url: URL, env: Env): Promise<Response> {
  try {
    const since = url.searchParams.get('since');
    let articles;
    if (since) {
      articles = await env.DB.prepare(
        'SELECT id, url AS link, title, description, source, image, pub_date AS pubDate FROM articles WHERE pub_date > ? ORDER BY pub_date DESC LIMIT 2000'
      )
        .bind(since)
        .all();
    } else {
      articles = await env.DB.prepare(
        'SELECT id, url AS link, title, description, source, image, pub_date AS pubDate FROM articles ORDER BY pub_date DESC LIMIT 2000'
      ).all();
    }
    return json({ articles: articles.results, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('Error reading news:', err);
    return json({ error: 'Failed to fetch news' }, 500);
  }
}

export async function handleStocks(env: Env): Promise<Response> {
  try {
    const stocks = await env.DB.prepare(
      'SELECT symbol, name, exchange, price, change, change_percent AS changePercent FROM stocks ORDER BY symbol'
    ).all();
    return json({ stocks: stocks.results });
  } catch (err) {
    console.error('Error reading stocks:', err);
    return json({ error: 'Failed to fetch stocks' }, 500);
  }
}

export async function handleLiveStreams(env: Env): Promise<Response> {
  try {
    const streams = await env.DB.prepare(
      'SELECT label, channel_id AS channelId, video_id AS videoId FROM live_streams'
    ).all();
    return json({ streams: streams.results });
  } catch (err) {
    console.error('Error reading live streams:', err);
    return json({ error: 'Failed to fetch live streams' }, 500);
  }
}

export function handleCors(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
