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

const ARABIC_RSS_FEEDS = [
  { url: 'https://www.aljazeera.net/aljazeerarss/ar/rss.xml', source: 'الجزيرة' },
  { url: 'https://feeds.bbci.co.uk/arabic/rss.xml', source: 'بي بي سي عربي' },
  { url: 'https://www.france24.com/ar/rss', source: 'فرانس 24' },
  { url: 'https://arabic.rt.com/rss/', source: 'آر تي عربي' },
  { url: 'https://www.alhurra.com/api/ziqiiqpm_qie', source: 'الحرة' },
];

const cache = {
  en: { news: [], lastFetch: 0 },
  ar: { news: [], lastFetch: 0 },
};
const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

async function fetchAllFeeds(lang = 'en') {
  const feeds = lang === 'ar' ? ARABIC_RSS_FEEDS : RSS_FEEDS;
  const c = cache[lang];
  const now = Date.now();
  if (now - c.lastFetch < CACHE_DURATION && c.news.length > 0) {
    return c.news;
  }

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

  const allItems = results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value)
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

  c.news = allItems;
  c.lastFetch = now;
  return allItems;
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/news', async (req, res) => {
  try {
    const lang = req.query.lang === 'ar' ? 'ar' : 'en';
    const since = req.query.since ? new Date(req.query.since) : null;
    let news = await fetchAllFeeds(lang);

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
  fetchAllFeeds('en'); // pre-warm English cache
  fetchAllFeeds('ar'); // pre-warm Arabic cache
});
