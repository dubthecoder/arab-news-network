const RSSParser = require('rss-parser');
const Redis = require('ioredis');

const parser = new RSSParser({
  customFields: {
    item: [
      ['media:thumbnail', 'mediaThumbnail'],
      ['media:content', 'mediaContent'],
    ],
  },
});
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const FETCH_INTERVAL = 2 * 60 * 1000; // 2 minutes
const TTL = 5 * 60; // 5 minutes
const OG_FETCH_TIMEOUT = 4000; // 4s timeout per article

const RSS_FEEDS = [
  { url: 'https://www.aljazeera.net/aljazeerarss/ar/rss.xml', source: '\u0627\u0644\u062c\u0632\u064a\u0631\u0629' },
  { url: 'https://feeds.bbci.co.uk/arabic/rss.xml', source: '\u0628\u064a \u0628\u064a \u0633\u064a \u0639\u0631\u0628\u064a' },
  { url: 'https://www.skynewsarabia.com/web/rss/middle-east.xml', source: '\u0633\u0643\u0627\u064a \u0646\u064a\u0648\u0632 \u0639\u0631\u0628\u064a\u0629' },
  { url: 'https://aawsat.com/feed', source: '\u0627\u0644\u0634\u0631\u0642 \u0627\u0644\u0623\u0648\u0633\u0637' },
  { url: 'https://arabic.cnn.com/api/v1/rss/rss.xml', source: 'CNN \u0639\u0631\u0628\u064a' },
  { url: 'https://rss.dw.com/rdf/rss-ar-all', source: 'DW \u0639\u0631\u0628\u064a' },
  { url: 'https://www.alhurra.com/feed', source: '\u0627\u0644\u062d\u0631\u0629' },
  { url: 'https://www.alaraby.co.uk/rss', source: '\u0627\u0644\u0639\u0631\u0628\u064a \u0627\u0644\u062c\u062f\u064a\u062f' },
];

// Fetch og:image from an article page when RSS has no image
async function fetchOgImage(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OG_FETCH_TIMEOUT);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (!res.ok) return '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let html = '';
    while (html.length < 30000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      if (html.includes('</head>')) break;
    }
    reader.cancel();
    const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    return match ? match[1] : '';
  } catch {
    return '';
  }
}

async function fetchFeeds(feeds) {
  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      try {
        const parsed = await parser.parseURL(feed.url);
        return parsed.items.map((item) => ({
          title: item.title || '',
          link: item.link || '',
          description: (item.contentSnippet || item.content || '').slice(0, 300),
          pubDate: item.pubDate || item.isoDate || '',
          source: feed.source,
          image:
            item.enclosure?.url ||
            item.mediaContent?.$.url ||
            item.mediaThumbnail?.$.url ||
            '',
        }));
      } catch (err) {
        console.error(`Failed to fetch ${feed.source}: ${err.message}`);
        return [];
      }
    })
  );

  const articles = results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value)
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  // Fetch og:image for articles missing images (in parallel)
  const needImage = articles.filter((a) => !a.image && a.link);
  if (needImage.length > 0) {
    console.log(`Fetching og:image for ${needImage.length} articles...`);
    const ogResults = await Promise.allSettled(
      needImage.map((a) => fetchOgImage(a.link))
    );
    ogResults.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value) {
        needImage[i].image = r.value;
      }
    });
    const found = ogResults.filter((r) => r.status === 'fulfilled' && r.value).length;
    console.log(`  Found ${found}/${needImage.length} og:images`);
  }

  return articles;
}

async function updateFeeds() {
  console.log('Fetching feeds...');
  try {
    const articles = await fetchFeeds(RSS_FEEDS);
    await Promise.all([
      redis.set('news:ar', JSON.stringify(articles), 'EX', TTL),
      redis.set('news:lastUpdate', new Date().toISOString()),
    ]);
    console.log(`Updated: ${articles.length} articles`);
  } catch (err) {
    console.error('Feed update error:', err);
  }
}

// Arab stock exchange indices (Yahoo Finance symbols)
const STOCK_INDICES = [
  { symbol: '^TASI', name: 'تاسي', exchange: 'السعودية' },
  { symbol: '^ADI', name: 'أبوظبي', exchange: 'الإمارات' },
  { symbol: '^DFMGI', name: 'دبي', exchange: 'الإمارات' },
  { symbol: '^EGX30', name: 'EGX 30', exchange: 'مصر' },
  { symbol: '^QSI', name: 'قطر', exchange: 'قطر' },
  { symbol: '^CASE30', name: 'مصر 30', exchange: 'مصر' },
];

async function fetchStocks() {
  console.log('Fetching stock data...');
  try {
    const symbols = STOCK_INDICES.map(s => s.symbol).join(',');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=symbol,regularMarketPrice,regularMarketChange,regularMarketChangePercent`,
      {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)' },
      }
    );
    clearTimeout(timeout);
    if (!res.ok) { console.error(`Stock fetch failed: ${res.status}`); return; }
    const data = await res.json();
    const quotes = (data.quoteResponse?.result || []).map(q => {
      const meta = STOCK_INDICES.find(s => s.symbol === q.symbol);
      return {
        symbol: q.symbol,
        name: meta?.name || q.symbol,
        exchange: meta?.exchange || '',
        price: q.regularMarketPrice || 0,
        change: q.regularMarketChange || 0,
        changePercent: q.regularMarketChangePercent || 0,
      };
    });
    await redis.set('stocks:ar', JSON.stringify(quotes), 'EX', TTL);
    console.log(`Updated: ${quotes.length} stock indices`);
  } catch (err) {
    console.error('Stock fetch error:', err.message);
  }
}

// Minimal HTTP server for Railway health checks
const http = require('http');
const PORT = process.env.PORT || 3002;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', service: 'worker' }));
}).listen(PORT, () => {
  console.log(`Worker health check on port ${PORT}`);
});

// Run immediately, then on interval
updateFeeds();
fetchStocks();
setInterval(updateFeeds, FETCH_INTERVAL);
setInterval(fetchStocks, FETCH_INTERVAL);
