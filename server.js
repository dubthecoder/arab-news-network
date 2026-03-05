const express = require('express');
const RSSParser = require('rss-parser');
const path = require('path');

const app = express();
const parser = new RSSParser();
const PORT = process.env.PORT || 3000;

const RSS_FEEDS = [
  { url: 'https://feeds.bbci.co.uk/news/world/middle_east/rss.xml', source: 'BBC' },
  { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
  { url: 'https://rss.nytimes.com/services/xml/rss/nyt/MiddleEast.xml', source: 'NY Times' },
  { url: 'https://www.theguardian.com/world/middleeast/rss', source: 'The Guardian' },
  { url: 'https://english.alarabiya.net/tools/rss', source: 'Al Arabiya' },
];

let cachedNews = [];
let lastFetch = 0;
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

async function fetchAllFeeds() {
  const now = Date.now();
  if (now - lastFetch < CACHE_DURATION && cachedNews.length > 0) {
    return cachedNews;
  }

  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (feed) => {
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

  const allItems = results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value)
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  cachedNews = allItems;
  lastFetch = now;
  return allItems;
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/news', async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since) : null;
    let news = await fetchAllFeeds();

    if (since) {
      news = news.filter((item) => new Date(item.pubDate) > since);
    }

    res.json({ articles: news, timestamp: new Date().toISOString() });
  } catch (err) {
    console.error('Error fetching news:', err);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

app.listen(PORT, () => {
  console.log(`ME News server running at http://localhost:${PORT}`);
  fetchAllFeeds(); // pre-warm cache
});
