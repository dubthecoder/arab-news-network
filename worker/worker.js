const RSSParser = require('rss-parser');
const Redis = require('ioredis');

const parser = new RSSParser();
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const FETCH_INTERVAL = 2 * 60 * 1000; // 2 minutes
const TTL = 5 * 60; // 5 minutes

const RSS_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml', source: 'BBC' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/MiddleEast.xml', source: 'NY Times' },
  { url: 'https://www.theguardian.com/world/middleeast/rss', source: 'The Guardian' },
];

const ARABIC_RSS_FEEDS = [
  { url: 'https://www.aljazeera.net/aljazeerarss/ar/rss.xml', source: '\u0627\u0644\u062c\u0632\u064a\u0631\u0629' },
  { url: 'https://feeds.bbci.co.uk/arabic/rss.xml', source: '\u0628\u064a \u0628\u064a \u0633\u064a \u0639\u0631\u0628\u064a' },
  { url: 'https://www.france24.com/ar/rss', source: '\u0641\u0631\u0627\u0646\u0633 24' },
  { url: 'https://arabic.rt.com/rss/', source: '\u0622\u0631 \u062a\u064a \u0639\u0631\u0628\u064a' },
];

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
          image: item.enclosure?.url || item['media:content']?.$.url || '',
        }));
      } catch (err) {
        console.error(`Failed to fetch ${feed.source}: ${err.message}`);
        return [];
      }
    })
  );

  return results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value)
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
}

async function updateFeeds() {
  console.log('Fetching feeds...');
  try {
    const [enArticles, arArticles] = await Promise.all([
      fetchFeeds(RSS_FEEDS),
      fetchFeeds(ARABIC_RSS_FEEDS),
    ]);

    await Promise.all([
      redis.set('news:en', JSON.stringify(enArticles), 'EX', TTL),
      redis.set('news:ar', JSON.stringify(arArticles), 'EX', TTL),
      redis.set('news:lastUpdate', new Date().toISOString()),
    ]);

    console.log(`Updated: ${enArticles.length} EN, ${arArticles.length} AR articles`);
  } catch (err) {
    console.error('Feed update error:', err);
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
setInterval(updateFeeds, FETCH_INTERVAL);
